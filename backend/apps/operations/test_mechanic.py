from datetime import timedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from apps.catalog.models import Division, Offering, Organization, ServiceArea
from .models import Booking

@override_settings(SECURE_SSL_REDIRECT=False)
class MechanicBookingTests(TestCase):
    def setUp(self):
        self.customer = get_user_model().objects.create_user(username='mechanic-customer', email='mechanic-customer@example.invalid')
        self.other = get_user_model().objects.create_user(username='mechanic-other', email='mechanic-other@example.invalid')
        self.provider = get_user_model().objects.create_user(username='mechanic-provider', email='mechanic-provider@example.invalid')
        self.provider.groups.add(Group.objects.get_or_create(name='Provider')[0])
        division = Division.objects.create(slug='mechanic', name='Mechanic', kind='service')
        organization = Organization.objects.create(owner=self.provider, division=division, name='Garage', approved=True)
        self.offering = Offering.objects.create(division=division, organization=organization, name='Inspection', slug='inspection', sku='MECHANIC-QA', price=600)
        area = ServiceArea.objects.create(name='Test area')
        area.divisions.add(division)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        self.details = {'vehicle_type':'motorbike','vehicle_model':'Test 150','registration':'DEMO-123','problem_type':'brakes','mobility':'unsafe','odometer_km':12000}
        self.payload = {'offering':self.offering.pk,'scheduled_at':(timezone.now()+timedelta(days=5)).isoformat(),'address':{'recipient':'Customer','phone':'01712345678','area':'Test area','line':'House 12'},'notes':'Brake noise','service_details':self.details}

    def submit(self, key='mechanic-qa'):
        return self.client.post('/api/v1/bookings/',self.payload,format='json',HTTP_IDEMPOTENCY_KEY=key)

    def test_details_saved_and_retry_is_idempotent(self):
        first=self.submit()
        self.assertEqual(first.status_code,201,first.data)
        self.assertEqual(first.data['service_details'],self.details)
        self.assertEqual(self.submit().data['id'],first.data['id'])
        self.assertEqual(Booking.objects.count(),1)
        self.payload['service_details']['vehicle_model']='Changed'
        self.assertEqual(self.submit().status_code,400)

    def test_invalid_details_do_not_create_booking(self):
        for field,value in [('vehicle_type','truck-unconfigured'),('problem_type','unknown'),('mobility','unknown'),('odometer_km',-1),('odometer_km',2.5),('vehicle_model','')]:
            with self.subTest(field=field,value=value):
                self.payload['service_details']={**self.details,field:value}
                self.assertEqual(self.submit(field+str(value)).status_code,400)
        self.assertEqual(Booking.objects.count(),0)

    def test_details_are_not_accepted_for_other_services(self):
        self.offering.division.slug='electrician'
        self.offering.division.save()
        self.assertEqual(self.submit().status_code,400)
        self.assertEqual(Booking.objects.count(),0)

    def test_only_customer_assigned_provider_and_authorized_operations_can_read(self):
        result=self.submit()
        self.assertEqual(result.status_code,201,result.data)
        url='/api/v1/bookings/'+result.data['id']+'/'
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code,404)
        booking=Booking.objects.get(pk=result.data['id'])
        booking.provider=self.provider
        booking.save(update_fields=['provider'])
        self.client.force_authenticate(self.provider)
        self.assertEqual(self.client.get(url).data['service_details'],self.details)

    def test_existing_generic_booking_contract_is_preserved(self):
        del self.payload['service_details']
        result=self.submit()
        self.assertEqual(result.status_code,201,result.data)
        self.assertEqual(result.data['service_details'],{})

    def test_report_requires_assigned_provider_and_active_work_and_gates_completion(self):
        result=self.submit()
        booking=Booking.objects.get(pk=result.data['id'])
        booking.provider=self.provider
        booking.status='in_progress'
        booking.save(update_fields=['provider','status'])
        url='/api/v1/bookings/'+str(booking.pk)+'/'
        report={'diagnosis':'Brake cable worn','work_performed':'Cable replaced and tested','parts_used':'Brake cable','follow_up':'Recheck in one week'}
        self.assertEqual(self.client.put(url+'mechanic_report/',report,format='json').status_code,403)
        self.client.force_authenticate(self.provider)
        self.assertEqual(self.client.post(url+'transition/',{'status':'completed'},format='json').status_code,400)
        self.assertEqual(self.client.put(url+'mechanic_report/',{'diagnosis':''},format='json').status_code,400)
        saved=self.client.put(url+'mechanic_report/',report,format='json')
        self.assertEqual(saved.status_code,200,saved.data)
        self.assertEqual(saved.data['mechanic_report'],report)
        completed=self.client.post(url+'transition/',{'status':'completed'},format='json')
        self.assertEqual(completed.status_code,200,completed.data)
        self.assertEqual(self.client.put(url+'mechanic_report/',report,format='json').status_code,400)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(url).data['mechanic_report'],report)
