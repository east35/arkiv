# Implementation Notes for Codex

This section provides implementation guidance but does not prescribe
strict architecture.

------------------------------------------------------------------------

# Suggested API Endpoints

## Notes

GET /objects/{objectId}/notes\
POST /objects/{objectId}/notes\
PUT /notes/{noteId}\
DELETE /notes/{noteId}

Example payload:

``` json
{
  "content": "The Chandrian might be tied to the earlier song."
}
```

------------------------------------------------------------------------

## Bookmarks

GET /objects/{objectId}/bookmarks\
POST /objects/{objectId}/bookmarks\
DELETE /bookmarks/{bookmarkId}

Example payload:

``` json
{
  "title": "World Map",
  "url": "https://example.com/map"
}
```

------------------------------------------------------------------------

## Progress

GET /objects/{objectId}/progress\
PUT /objects/{objectId}/progress

Example payload:

``` json
{
  "type": "chapter",
  "value": "12",
  "confidence": "manual"
}
```

------------------------------------------------------------------------

## AI Conversation

GET /objects/{objectId}/conversation\
POST /objects/{objectId}/conversation/message

Example:

``` json
{
  "message": "Why did Kvothe lie in the last chapter?"
}
```

------------------------------------------------------------------------

# Backend Components

## Notes Service

Handles:

-   CRUD for notes
-   note storage
-   object association

## Bookmark Service

Handles:

-   link storage
-   URL validation
-   object association

## Progress Service

Handles:

-   progress state
-   validation
-   spoiler boundary updates

## AI Context Builder

Constructs the context sent to the AI provider.

Example:

``` json
{
  "objectTitle": "The Name of the Wind",
  "objectType": "book",
  "progress": "Chapter 12",
  "notes": [],
  "bookmarks": [],
  "conversationSummary": "",
  "recentMessages": []
}
```

## AI Provider Adapter

Responsible for:

-   sending requests to AI providers
-   attaching user API keys
-   normalizing responses

Possible providers:

-   OpenAI
-   Anthropic
-   Gemini

------------------------------------------------------------------------

# Prompt Template Example

System prompt template:

    You are assisting a user discussing "<objectTitle>".

    Current progress:
    <progress>

    Do not reveal spoilers beyond this point.

    User Notes:
    <notes>

    Bookmarks:
    <bookmarks>

    Conversation Memory:
    <conversationSummary>

    Recent Messages:
    <recentMessages>

    User Message:
    <userMessage>

------------------------------------------------------------------------

# Context Compaction Trigger

Compaction should occur when:

    message_count > 20
    OR
    token_estimate > threshold

Steps:

1.  Summarize older messages.
2.  Store summary as conversation memory.
3.  Retain only recent messages.

------------------------------------------------------------------------

# Frontend Components

Suggested modular components:

## NotesList

-   create
-   edit
-   delete

## BookmarkList

-   add
-   remove
-   open link

## AIChat

-   message history
-   message input
-   loading state
-   error handling

------------------------------------------------------------------------

# Security Considerations

1.  API keys must never be exposed to the client.
2.  AI requests should be proxied through the backend.
3.  Validate all user-provided URLs.
4.  Protect endpoints using existing authentication.

------------------------------------------------------------------------

# Performance Considerations

-   Cache AI responses when possible.
-   Limit conversation history size.
-   Lazy-load notes and bookmarks.

Example cache key:

    objectId + progress + promptType
