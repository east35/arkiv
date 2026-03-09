---
title: "Status Sheet"
slug: "status-sheet"
status: active
category: infrastructure
priority: critical
owner: "east35"
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: ["shelflog"]
updated_at: "2026-03-09T14:17:09.185955+00:00"
created_at: "2026-03-09T13:58:53.318722+00:00"
---
## Notes
The order of the list determines the hierarchy of the sheet. Details, followed by dates, notes, etc. 

## Behavior

# Desktop
- Modal
- Row 1: Status
- Row 2: score / progress
- Row 3: Dates, Start / Status
- Row 4: Notes
- Row 5: CTA 1 / 2
- Row 6: Metadata

# Mobile
- Sheet View
- Row 1: Status
- Row 2: score
- Row 3: progress
- Row 4: Dates, Start
- Row 5: Dates, Status
- Row 6: Notes
- Row 7: CTA 1
- Row 8: CTA 2
- Row 9: Metadata

## Details

# Status
- Field: single selection picker
- Backlog
- In Progress
- Paused
- Completed
- Dropped

# Score (counter)
- Field: counter
- 0 to 10, to the tenths.

#Progress (Video Game)
- Field: Number picker, enable keyboard typing
- Time Played (I want this expressed as Hours and Minutes, no need for seconds. If we can scrape this data from Steam, even better. Data entry should be fuzzy, don't want to have to follow a strict method like HH:MM or H:M) 

# Progress (Books)
- Page count. Need to pull page total from source. 

## Dates
These dates are critical. It's how the app tracks core analytics. Start date should always be visible. The second date relates to the status. 

# Started
- Opens native date picker
- Auto adds current date when status changes to "In Progress" 
- MM/DD/YYYY, HH:MM AM/PM 

# Completed
- Opens native date picker
- Auto adds current date when status changes to "Completed" 
- MM/DD/YYYY, HH:MM AM/PM 

# Paused
- Opens native date picker
- Auto adds current date when status changes to "Paused" 
- MM/DD/YYYY, HH:MM AM/PM 

# Dropped
- Opens native date picker
- Auto adds current date when status changes to "Dropped" 
- MM/DD/YYYY, HH:MM AM/PM 

## Metadata
Tertiary information such as: backlog status date, data source (if pulled from external API), lists it populates in. 