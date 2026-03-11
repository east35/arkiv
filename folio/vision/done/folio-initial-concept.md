---
title: "Initial Concept"
slug: "folio-initial-concept"
status: done
category: vision
priority: high
owner: "east35"
phase: null
kind: null
sdd_lane: null
dependencies: []
tags: ["shelflog"]
updated_at: "2026-03-11T13:42:20.860732+00:00"
created_at: "2026-03-08T17:44:14.74696+00:00"
---


## Intent

I want to create this app because it fills a niche that I have, but the primary focus is to fully test out a non-coding development process I want to try. The key of this process is what we're using right now, which is the Folio app I developed. The idea is we have these markdown files living within the repo that our agents use for context when building out features.

## Problem Statement

- Today I'm using a tool called Yamtrack to track what books and video games are in progress and completed. Also, which books and video games have paused or just dropped entirely. It also helps me track how long I've spent reading and playing games and what I think about them, meaning I can leave ratings. 
- I've tried multiple programs and none of them have really hit exactly what I'm looking for. I tried Sofa app for iOS and it was really nice, except for it was stuck to the iOS platform. And because it was based on iCloud, whenever the engineer updated the app, it would sometimes just kill all of my data. 
- Yamatrack has been the best tool of use so far, but it has way more functionality than I need. I'm only using maybe 20% of what it offers. And I've had problems with tracking or sorry, adding and searching for content. If you don't get the name exactly right, there's no fuzzy search.

So it's just a pain trying to add things to it, having to like know exactly the correct formatting and grammar for video game titles, which can be super long and weird.

## Target Users

- Myself for now

## Success Criteria

- [ ] Stress test the Folio app and how it informs agents.
- [ ] Fully replace Yamtrack as my collection progress tracking app.

## Open Questions

- Does Folio improve the process or is it more tool friction?

## Working Notes

How do we test a fully non-engineer development pipeline? We're going to assume that I don't know anything about coding whatsoever, which isn't entirely true. I do know how to do front-end, but no back-end. 

I want to follow the agentic CTO management of this app, meaning instead of me, myself playing the CTO role, we have a CTO agent that we pipe through these documents and it sort of coordinates the development and plans of the app. 

Here's the process I'm thinking for deploying, let's say a beta. Define, explore, research within Folio. Use Claude for developing plans based off of Folio notes. Create spec-driven development documents based off of Claude plans. Use claude to build out backend for app. Use linear to track issues and manage the build process. Use Gemini to build front end. The app is built on Next.js (open to changing).

## Decision Log

| Date | Delta | Resolution |
|------|-------|------------|