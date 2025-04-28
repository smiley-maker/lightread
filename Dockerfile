# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Set environment variable for Flask and Python
ENV FLASK_APP=server.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV GUNICORN_CMD_ARGS="--bind=0.0.0.0:3000 --workers=2 --threads=4 --timeout=120 --log-level=debug --error-logfile=- --access-logfile=- --capture-output --enable-stdio-inheritance"

# Run with more verbose logging
CMD ["sh", "-c", "python -V && pip list && gunicorn server:app"]
