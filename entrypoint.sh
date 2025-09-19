#!/bin/bash
set -e

# Start X virtual framebuffer (display :99)
Xvfb :99 -screen 0 1920x1080x24 -ac &

# small delay to ensure Xvfb up
sleep 0.5

export DISPLAY=:99

# Optional: show info for debugging
echo "DISPLAY set to $DISPLAY"
echo "Starting app as $(whoami) PID $$"
exec "$@"
