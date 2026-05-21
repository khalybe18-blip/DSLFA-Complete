import requests
import os
import time

BASE_URL = "http://localhost:5000/api"
V1_BASE_URL = "http://localhost:5000/api/v1"

def test_e2e():
    print("Starting E2E verification...")

    # 1. Register Teacher
    teacher_data = {
        "name": "Teacher Test",
        "email": "teacher_e2e@test.com",
        "password": "Password123",
        "role": "teacher"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=teacher_data)
    print(f"Teacher Registration: {resp.status_code}")
    # If 409, assume already exists and continue to login

    # 2. Login Teacher
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "teacher_e2e@test.com",
        "password": "Password123"
    })
    print(f"Teacher Login: {resp.status_code}")
    teacher_token = resp.json().get("token")
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

    # 3. Create Classroom
    classroom_data = {
        "class_name": "AI 101",
        "subject": "Artificial Intelligence"
    }
    resp = requests.post(f"{V1_BASE_URL}/classrooms/create", json=classroom_data, headers=teacher_headers)
    print(f"Create Classroom: {resp.status_code}")
    classroom = resp.json().get("classroom")
    if not classroom:
        print(f"Error creating classroom: {resp.json()}")
        return
    class_id = classroom.get("class_id")
    class_code = classroom.get("class_code")
    print(f"Class ID: {class_id}, Class Code: {class_code}")

    # 4. Upload Resource
    file_path = "c:\\Users\\aksha\\Advance-AI-Edtech-Platform\\test_resource.txt"
    with open(file_path, "rb") as f:
        files = {"file": f}
        resp = requests.post(f"{V1_BASE_URL}/classrooms/{class_id}/resources/upload", files=files, headers=teacher_headers)
    print(f"Upload Resource: {resp.status_code}")

    # 5. Create Quiz
    quiz_data = {
        "title": "AI Basics Quiz",
        "bloom_distribution": {"remember": 100},
        "questions": [
            {
                "text": "What is RAG?",
                "question_type": "mcq",
                "options": ["Random Access Generation", "Retrieval-Augmented Generation", "Rapid AI Growth", "Robust Analytic Grid"],
                "correct_answer": "Retrieval-Augmented Generation",
                "bloom_level": "remember",
                "marks": 1
            }
        ]
    }
    resp = requests.post(f"{V1_BASE_URL}/classrooms/{class_id}/quizzes", json=quiz_data, headers=teacher_headers)
    print(f"Create Quiz: {resp.status_code}")

    # 6. Register Student
    student_data = {
        "name": "Student Test",
        "email": "student_e2e@test.com",
        "password": "Password123",
        "role": "student"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=student_data)
    print(f"Student Registration: {resp.status_code}")

    # 7. Login Student
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "student_e2e@test.com",
        "password": "Password123"
    })
    print(f"Student Login: {resp.status_code}")
    student_token = resp.json().get("token")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 8. Join Classroom
    resp = requests.post(f"{V1_BASE_URL}/classrooms/join", json={"class_code": class_code}, headers=student_headers)
    print(f"Join Classroom: {resp.status_code}")

    # 9. Ask Question to AI Tutor (RAG check)
    chat_data = {
        "message": "What is RAG?",
        "class_id": class_id
    }
    resp = requests.post(f"{BASE_URL}/ai/chat", json=chat_data, headers=student_headers)
    print(f"AI Chat (with class_id): {resp.status_code}")
    if resp.status_code == 200:
        print(f"AI Response: {resp.json().get('response')}")
    else:
        print(f"AI Chat Error: {resp.json()}")

    # 10. Security Checks
    # Attempt to create classroom as student
    resp = requests.post(f"{V1_BASE_URL}/classrooms/create", json=classroom_data, headers=student_headers)
    print(f"Security Check (Student creating class): {resp.status_code} (Expected 403)")

    # 11. Multi-Class Isolation Check
    # Teacher creates Class B
    class_b_data = {"class_name": "Class B", "subject": "Biology"}
    resp = requests.post(f"{V1_BASE_URL}/classrooms/create", json=class_b_data, headers=teacher_headers)
    class_b_id = resp.json().get("classroom").get("class_id")
    print(f"Teacher created Class B (ID: {class_b_id})")

    # Student (not enrolled in Class B) attempts to access Class B resources
    resp = requests.get(f"{V1_BASE_URL}/classrooms/{class_b_id}/resources", headers=student_headers)
    print(f"Isolation Check (Student accessing Class B resources): {resp.status_code} (Expected 403)")

    # Student (not enrolled in Class B) attempts to chat with Class B context
    chat_data_b = {"message": "Hello", "class_id": class_b_id}
    resp = requests.post(f"{BASE_URL}/ai/chat", json=chat_data_b, headers=student_headers)
    print(f"Isolation Check (Student chatting with Class B context): {resp.status_code} (Expected 403)")

if __name__ == "__main__":
    test_e2e()
