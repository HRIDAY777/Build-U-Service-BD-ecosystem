from django.db import models


class Page(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=180)
    title_bn = models.CharField(max_length=180)
    body = models.TextField()
    body_bn = models.TextField(blank=True)
    description = models.CharField(max_length=300)
    published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class FAQ(models.Model):
    question = models.CharField(max_length=250)
    question_bn = models.CharField(max_length=250)
    answer = models.TextField()
    answer_bn = models.TextField()
    published = models.BooleanField(default=True)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]
