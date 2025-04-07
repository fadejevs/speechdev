#!/bin/bash
gunicorn --worker-class gevent wsgi:app
