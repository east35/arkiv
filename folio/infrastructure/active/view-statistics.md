---
title: "View: Statistics"
slug: "view-statistics"
status: active
category: infrastructure
priority: high
owner: "east35"
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: ["shelflog"]
updated_at: "2026-03-09T15:43:19.816368+00:00"
created_at: "2026-03-09T15:26:25.519883+00:00"
---
## Sort

# Tab 1: Predefined Ranges
- Today
- Yesterday
- This Week
- Last 7 Days
- This Month
- Last 30 Days
- Last 90 Days
- This Year 
- Last 6 Months
- Last 12 Months
- All Time

# Tab 2: Custom Range
- Start Date (same picker from status sheet)
- End Date (same picker from status sheet)
- Range preview
- Cancel
- Apply Range

## High Level Stats

1 row, 4 objects (on desktop, stack on mobile) 

# Completed Items
- Check mark icon
- Current count / total object count

# Average Rating
- Ribbon icon
- Average / '10'

# Most Active Date
- Calendar icon
- Day of week
- '##%' of activity

# Current Streak
- Fire icon
- '#' days
- 'Longest: # days'

## Activity History

This is just like the github activity view. 
- X axis: Month
- Y axis: Day of Week
- Each day is a varying degree of color opacity which indicates level of activity

## Media Type Distribution

Pie Chart
- Slice 1: Game
- Slice 2: Book
- Key

## Status Distribution

Pie Chart
- Slice 1: Completed
- Slice 2: In Progress
- Slice 3: Backlog
- Slice 4: Paused
- Slice 5: Dropped
- Key

## Status Distribution by Media Type

# Bar Chart
- X axis: Media Type (game, book)
- Y axis: Count

# Bar Slices
- Slice 1: Completed
- Slice 2: In Progress
- Slice 3: Backlog
- Slice 4: Paused
- Slice 5: Dropped
- Key

## Score Distribution by Media Type

# Bar Chart
- X axis: score from 0 to 10
- Y axis: number of items

# Bar Slices
- Slice 1: Game
- Slice 2: Book
- Key

## Top Rated Media

This view is basically the object view, consolidating both books and games, ordered by review and date completed.

## Vertical timeline with cards (or timeline feed)

A vertically ordered timeline that displays media events grouped by month. Events are positioned along a central vertical axis and rendered as cards alternating left and right of the axis.

# Structure

Time Axis
- Vertical line representing chronological progression.
- Newer entries appear higher (or lower, depending on implementation).
- Each event attaches to the axis with a marker node.

Time Group Headers
- Events are grouped by month/year.
- Example: March 2026, February 2026.

Event Nodes
- Each event is represented by a card connected to the axis.
- Cards alternate left/right of the axis to improve readability grouped by month.

Event Card Content
- Media artwork thumbnail
- Title
- Status
- Timestamp (date + optional time)
- Optional metadata (rating, duration, etc.)

Ordering
- Events are sorted chronologically descending.
- Groups appear in descending order by month.