from django.db import migrations


def preserve_responses(apps, schema_editor):
    Ticket = apps.get_model("engagement", "SupportTicket")
    Message = apps.get_model("engagement", "SupportMessage")
    for ticket in Ticket.objects.using(schema_editor.connection.alias).exclude(response="").iterator():
        Message.objects.using(schema_editor.connection.alias).create(
            ticket_id=ticket.pk, sender_role="team", body=ticket.response,
        )


class Migration(migrations.Migration):
    dependencies = [("engagement", "0002_supportmessage")]
    operations = [migrations.RunPython(preserve_responses, migrations.RunPython.noop)]
