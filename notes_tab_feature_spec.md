# Notes Tab Enhancements (AI + Bookmarks) --- Feature Spec

## Overview

The Notes tab already exists in the item detail view but is currently
empty.

This feature introduces functionality to the existing Notes tab:

-   User-authored notes
-   Bookmark links
-   AI discussion tied to the item

Each item (book or game) acts as an **AI context container** where users
can discuss the item with AI based on their **current progress**.

The feature must function **without AI enabled**, but AI capabilities
will activate if the user configures an AI provider.

------------------------------------------------------------------------

# Goals

1.  Turn the existing Notes tab into a **workspace for interacting with
    an item**.
2.  Allow users to **store notes and links related to the item**.
3.  Enable **AI discussion about the item** with spoiler-safe
    boundaries.
4.  Track **user progress** so AI responses remain safe and contextual.
5.  Maintain full functionality when AI is disabled.

------------------------------------------------------------------------

# UI Behavior

## Notes Tab

The existing Notes tab will contain three sections:

-   Notes
-   Bookmarks
-   AI Discussion (only visible if AI is enabled)

Example layout:

    Notes Tab
    --------------------------------

    User Notes
    [ list of notes ]

    Bookmarks
    [ list of links ]

    AI Discussion
    [ conversation thread ]

    Message input

------------------------------------------------------------------------

# Desktop Hover Behavior

When hovering over an item in the collection UI:

Current behavior: - Show **Enrichment / Sync button**

New behavior: - Replace with **Notes deeplink**

Example:

    navigateTo(itemId, tab="notes")

------------------------------------------------------------------------

# Mobile Behavior

Current behavior: - First tap opens **status sheet**

New behavior: - First tap opens the **Notes tab**

Status editing remains accessible elsewhere.

------------------------------------------------------------------------

# Progress Tracking

Progress will be **user-controlled state**.

## Progress Model

    Progress {
      type: chapter | page | percent | act | quest | area | freeform
      value: string
      updatedAt: timestamp
      confidence: manual | imported | inferred
    }

Examples:

Books: - Chapter 12 - Page 240 - 40%

Games: - Act 2 - Quest: Into the Mines - Area: Castle Ruins

Freeform examples: - "Just after the tavern conversation" - "Right
before the boss fight"

------------------------------------------------------------------------

# Spoiler Boundary

Progress defines a **spoiler boundary**.

AI responses must:

-   Avoid revealing events beyond this progress point
-   Prefer conservative responses if progress is ambiguous

Example instruction used in prompts:

    The user is currently at <progress>.
    Do not reveal spoilers beyond this point.

------------------------------------------------------------------------

# Notes

Users can create notes associated with an item.

Example uses:

Books: - themes - character observations - predictions - quotes

Games: - strategies - lore notes - quest reminders

## Note Model

    Note {
      id
      objectId
      content
      createdAt
      updatedAt
    }

------------------------------------------------------------------------

# Bookmarks

Bookmarks store **external links relevant to an item**.

Examples:

Games: - walkthroughs - guides - wiki pages - FAQs

Books: - maps - research references - historical context

## Bookmark Model

    Bookmark {
      id
      objectId
      title
      url
      createdAt
    }

Users can:

-   add bookmarks
-   delete bookmarks
-   open bookmarks

The UI must allow navigation back to the originating item.

------------------------------------------------------------------------

# AI Discussion

If AI is enabled, users can have a conversation about the item.

Examples:

-   "Summarize the story so far"
-   "Who are the important characters?"
-   "What themes should I pay attention to?"
-   "What happened in the scene where...?"

The AI must use item context and respect the spoiler boundary.

------------------------------------------------------------------------

# Conversation Model

Each item maintains its own conversation history.

    AIConversation {
      objectId
      messages[]
    }

Message structure:

    Message {
      role: user | assistant
      content
      createdAt
    }

------------------------------------------------------------------------

# Context Compaction

To control prompt size and cost:

1.  Summarize older conversation messages.
2.  Store the summary as conversation memory.
3.  Keep only recent messages.

Prompt structure:

    System instructions
    Item metadata
    Progress boundary
    Bookmarks
    Notes
    Conversation memory summary
    Recent messages
    User message

------------------------------------------------------------------------

# Future Enhancements

These ideas should not be implemented in the initial release.

## Platform Integrations

Possible sources:

-   Steam
-   PlayStation
-   Xbox
-   Kindle

Imported signals should not override user-defined progress.

## Scene Memory

Structured memory for story moments.

## Browser Bookmark Extension

Allow bookmarking web pages directly into Arkiv.

------------------------------------------------------------------------

# Acceptance Criteria

## Notes

-   Users can create a note within the Notes tab.
-   Users can edit existing notes.
-   Users can delete notes.
-   Notes are stored per object.

## Bookmarks

-   Users can add a bookmark with a title and URL.
-   Users can delete bookmarks.
-   Clicking a bookmark opens the link.
-   Users can return to the originating object after viewing a bookmark.

## AI Discussion

-   AI Discussion section appears only when AI is configured.
-   Users can send messages to the AI.
-   AI responses appear in the conversation thread.
-   Conversation history persists per object.

## Progress

-   Users can manually update progress.
-   Progress updates modify the AI spoiler boundary.
-   AI responses must respect the current progress.

## Non‑AI Mode

-   Notes and bookmarks remain fully functional.
-   AI discussion UI is hidden.
