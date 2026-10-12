from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('operations', '0017_booking_mechanic_report')]
    operations = [migrations.AddField(model_name='booking', name='problem_photo', field=models.FileField(blank=True, upload_to='mechanic-photos/%Y/%m/'))]
