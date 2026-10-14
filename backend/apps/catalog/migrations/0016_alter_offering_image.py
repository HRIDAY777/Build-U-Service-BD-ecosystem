from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0015_offeringmedia_shopbrand_shopcollection_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="offering",
            name="image",
            field=models.CharField(blank=True, max_length=1000),
        ),
    ]
