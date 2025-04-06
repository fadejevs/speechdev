from app import app, socketio
from flask import render_template

# --- COMMENT OUT OR DELETE THE if __name__ BLOCK ---
# if __name__ == '__main__':
#     # We will use 'flask run' instead
#     socketio.run(app, debug=True, port=5000)
# --- END CHANGE ---

@app.route('/')
def index():
    # This route might not be strictly necessary if your frontend handles all routing
    # but it doesn't hurt to leave it for now.
    # Make sure you have an 'index.html' in 'app/templates/' if you want this to work.
    # If not, you can comment out this route too.
    try:
        return render_template('index.html')
    except Exception:
        # Handle case where index.html might be missing
        return "Flask server is running. Navigate to the frontend application."