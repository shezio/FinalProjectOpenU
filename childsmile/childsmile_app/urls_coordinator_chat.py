"""
URL routing for coordinator chat endpoints
"""

from django.urls import path
from .coordinator_chat_views import (
    coordinator_conversations_list,
    coordinator_chat_history,
    send_message_to_coordinator,
    send_message_to_many,
    send_message_to_all,
)

urlpatterns = [
    # List all conversations
    path('coordinator-chat/conversations/', coordinator_conversations_list, name='coordinator_conversations_list'),
    
    # Get chat history with specific coordinator
    path('coordinator-chat/<int:coordinator_id>/', coordinator_chat_history, name='coordinator_chat_history'),
    
    # Send message to single coordinator
    path('coordinator-chat/<int:coordinator_id>/send/', send_message_to_coordinator, name='send_message_to_coordinator'),
    
    # Send message to multiple coordinators
    path('coordinator-chat/send-many/', send_message_to_many, name='send_message_to_many'),
    
    # Send message to all coordinators
    path('coordinator-chat/send-all/', send_message_to_all, name='send_message_to_all'),
]
