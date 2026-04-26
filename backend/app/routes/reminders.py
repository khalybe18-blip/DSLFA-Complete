from flask import Blueprint, jsonify, request
from app import db
from app.models.reminder import Reminder
from datetime import datetime

reminders_bp = Blueprint('reminders', __name__)

@reminders_bp.route('', methods=['GET'])
def get_reminders():
    # Show closest dates first
    reminders = Reminder.query.order_by(Reminder.date.asc()).all()
    return jsonify({'reminders': [r.to_dict() for r in reminders]}), 200

@reminders_bp.route('', methods=['POST'])
def add_reminder():
    data = request.json
    
    title = data.get('title')
    date_str = data.get('date') # e.g. "2026-10-12T10:00:00"
    description = data.get('description', '')
    
    if not title or not date_str:
        return jsonify({'message': 'Title and date are required'}), 400
        
    try:
        # Strip trailing Z for easy Python fromisoformat compatibility
        clean_date_str = date_str.replace('Z', '')
        parsed_date = datetime.fromisoformat(clean_date_str)
        
        new_reminder = Reminder(
            title=title,
            date=parsed_date,
            description=description
        )
        
        db.session.add(new_reminder)
        db.session.commit()
        
        return jsonify({'message': 'Reminder added successfully', 'reminder': new_reminder.to_dict()}), 201
        
    except Exception as e:
        return jsonify({'message': f'Failed to add reminder: {str(e)}'}), 500

@reminders_bp.route('/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    reminder = Reminder.query.get(reminder_id)
    if not reminder:
        return jsonify({'message': 'Reminder not found'}), 404
        
    db.session.delete(reminder)
    db.session.commit()
    
    return jsonify({'message': 'Reminder deleted'}), 200
