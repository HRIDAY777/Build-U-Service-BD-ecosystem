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

    def test_reschedule_permissions_hours_and_terminal_states(self):
        result = self.submit()
        booking = Booking.objects.get(pk=result.data['id'])
        url = '/api/v1/bookings/' + str(booking.pk) + '/reschedule/'
        new_time = timezone.now() + timedelta(days=7)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json').status_code, 404)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.post(url, {'scheduled_at': timezone.now().isoformat()}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'scheduled_at': 'invalid'}, format='json').status_code, 400)
        response = self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.scheduled_at, new_time)
        from .models import AuditLog
        self.assertEqual(AuditLog.objects.filter(action='booking.rescheduled').count(), 1)
        self.assertEqual(self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json').status_code, 200)
        self.assertEqual(AuditLog.objects.filter(action='booking.rescheduled').count(), 1)
        from zoneinfo import ZoneInfo
        self.offering.service_leave_dates = [new_time.astimezone(ZoneInfo('Asia/Dhaka')).date().isoformat()]
        self.offering.save()
        self.assertEqual(self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json').status_code, 400)
        for status in ['on_the_way', 'arrived', 'in_progress', 'waiting_for_parts', 'completed', 'cancelled', 'failed']:
            booking.status = status
            booking.save()
            self.assertEqual(self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json').status_code, 400)

    def test_reschedule_checks_provider_and_preserves_booking(self):
        result = self.submit()
        booking = Booking.objects.get(pk=result.data['id'])
        booking.provider = self.provider
        booking.status = 'assigned'
        booking.save()
        new_time = timezone.now() + timedelta(days=8)
        other = Booking.objects.create(customer=self.other, offering=self.offering, provider=self.provider, status='assigned', scheduled_at=new_time, duration_minutes=booking.duration_minutes, price=600, address=booking.address, idempotency_key='conflict')
        url = '/api/v1/bookings/' + str(booking.pk) + '/reschedule/'
        self.assertEqual(self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json').status_code, 400)
        booking.refresh_from_db()
        self.assertNotEqual(booking.scheduled_at, new_time)
        other.status = 'cancelled'
        other.save()
        self.client.force_authenticate(self.provider)
        self.assertEqual(self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json').status_code, 403)
        self.client.force_authenticate(self.customer)
        response = self.client.post(url, {'scheduled_at': new_time.isoformat()}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'assigned')
        self.assertEqual(booking.service_details, self.details)
        from .models import ProviderProfile
        ProviderProfile.objects.create(user=self.provider, available=False)
        self.assertEqual(self.client.post(url, {'scheduled_at': (new_time + timedelta(days=1)).isoformat()}, format='json').status_code, 400)

    def test_problem_photo_validation_private_access_and_closed_booking(self):
        import tempfile
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            result = self.submit()
            booking = Booking.objects.get(pk=result.data['id'])
            url = '/api/v1/bookings/' + str(booking.pk) + '/problem-photo/'
            def photo():
                output = BytesIO()
                Image.new('RGB', (20, 20), 'red').save(output, format='PNG')
                return SimpleUploadedFile('problem.png', output.getvalue(), content_type='image/png')
            self.assertEqual(self.client.post(url, {'photo': SimpleUploadedFile('fake.jpg', b'not an image')}, format='multipart').status_code, 400)
            self.assertEqual(self.client.post(url, {'photo': SimpleUploadedFile('huge.jpg', b'x' * (5 * 1024 * 1024 + 1))}, format='multipart').status_code, 400)
            uploaded = self.client.post(url, {'photo': photo()}, format='multipart')
            self.assertEqual(uploaded.status_code, 200, uploaded.data)
            self.assertTrue(uploaded.data['has_problem_photo'])
            self.assertNotIn('problem_photo', uploaded.data)
            image = self.client.get(url)
            self.assertEqual(image.status_code, 200)
            self.assertEqual(image['Content-Type'], 'image/jpeg')
            self.assertEqual(image['Cache-Control'], 'private, no-store')
            for close_file in image._resource_closers:
                close_file()
            self.client.force_authenticate(self.other)
            self.assertEqual(self.client.get(url).status_code, 404)
            self.assertEqual(self.client.post(url, {'photo': photo()}, format='multipart').status_code, 404)
            booking.provider = self.provider
            booking.save(update_fields=['provider'])
            self.client.force_authenticate(self.provider)
            image = self.client.get(url)
            self.assertEqual(image.status_code, 200)
            for close_file in image._resource_closers:
                close_file()
            self.assertEqual(self.client.delete(url).status_code, 403)
            self.client.force_authenticate(self.customer)
            with self.captureOnCommitCallbacks(execute=True):
                self.assertEqual(self.client.delete(url).status_code, 200)
            self.assertEqual(self.client.get(url).status_code, 404)
            self.assertEqual(self.client.post(url, {'photo': photo()}, format='multipart').status_code, 200)
            booking.refresh_from_db()
            booking.status = 'completed'
            booking.save()
            self.assertEqual(self.client.delete(url).status_code, 400)
            self.assertEqual(self.client.post(url, {'photo': photo()}, format='multipart').status_code, 400)
