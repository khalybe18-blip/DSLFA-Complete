"""Shared access-control helpers for documents, AI, and quiz routes."""
from __future__ import annotations

from sqlalchemy import or_

from app.models.classroom import Classroom, Enrollment
from app.models.document import Document


def user_can_access_class_context(user, class_id: int | None) -> bool:
    """True if user is the facilitator or an enrolled student of this class."""
    if not user or class_id is None:
        return False
    classroom = Classroom.query.get(int(class_id))
    if not classroom:
        return False
    if classroom.facilitator_id == user.id or user.role == 'admin':
        return True
    return (
        Enrollment.query.filter_by(student_id=user.id, class_id=int(class_id)).first()
        is not None
    )


def user_can_read_document(user, document: Document | None) -> bool:
    """Read access: uploader, class facilitator, or enrolled student for class materials."""
    if not user or document is None:
        return False
    if document.uploader_id is not None and document.uploader_id == user.id:
        return True
    if document.class_id is None:
        return False
    return user_can_access_class_context(user, document.class_id)


def accessible_documents_filter(user):
    """SQLAlchemy filter for documents visible to this user."""
    from sqlalchemy import and_
    
    enrolled_ids = [e.class_id for e in user.enrollments.all()]
    teaching_ids = [c.class_id for c in user.classrooms_teaching.all()]
    
    # Condition 0: Admin sees everything
    if user.role == 'admin':
        return True
    
    # Condition 1: User is the uploader
    conds = [Document.uploader_id == user.id]
    
    # Condition 2: Classroom documents
    if teaching_ids:
        # Facilitators see everything in their classrooms
        conds.append(Document.class_id.in_(teaching_ids))
    
    if enrolled_ids:
        # Students ONLY see visible materials in their enrolled classrooms
        conds.append(and_(Document.class_id.in_(enrolled_ids), Document.is_visible == True))
        
    return or_(*conds)
