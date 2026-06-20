# backend/services/chat_service/chat_service/middleware/rate_limit.py
from __future__ import annotations

import time
import uuid
from collections import defaultdict
from typing import Dict, List

# In-memory rate limiter (for single-instance deployments)
# For multi-instance deployments, use Redis-based rate limiting
class InMemoryRateLimiter:
    def __init__(self):
        # Store timestamps of requests per user
        self.requests: Dict[uuid.UUID, List[float]] = defaultdict(list)
        self.window = 10.0  # 10 second window
        self.max_requests = 10  # Max 10 messages per window
    
    def is_allowed(self, user_id: uuid.UUID) -> bool:
        """Check if user is allowed to make a request."""
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove requests outside the time window
        self.requests[user_id] = [
            req_time for req_time in user_requests 
            if now - req_time < self.window
        ]
        
        # Check if under limit
        if len(self.requests[user_id]) < self.max_requests:
            self.requests[user_id].append(now)
            return True
        
        return False
    
    def get_remaining(self, user_id: uuid.UUID) -> int:
        """Get remaining requests for user in current window."""
        now = time.time()
        user_requests = self.requests[user_id]
        
        # Remove requests outside the time window
        self.requests[user_id] = [
            req_time for req_time in user_requests 
            if now - req_time < self.window
        ]
        
        return max(0, self.max_requests - len(self.requests[user_id]))
    
    def reset(self, user_id: uuid.UUID) -> None:
        """Reset rate limit for a user."""
        if user_id in self.requests:
            del self.requests[user_id]


# Global rate limiter instance
_rate_limiter = InMemoryRateLimiter()


def get_rate_limiter() -> InMemoryRateLimiter:
    """Get the global rate limiter instance."""
    return _rate_limiter
