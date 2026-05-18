# Security Spec for EchoTrack Firestore

## Data Invariants
1. A **User** profile can only be created with a valid role.
2. A **WeeklyReport** must be linked to a valid `studentId` and `cycleId`.
3. Only the owner (Student) can create or update their own DRAFT report.
4. Staff (Admin, PM, Coach) can only update reports to REVIEWED status if they are authorized.
5. Users cannot change their own `role` once set or set it to ADMIN during signup.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Create a user profile with `userId` of another user.
2. **Privilege Escalation**: Update own `role` to 'ADMIN'.
3. **Orphaned Write**: Create a report for a non-existent student profile.
4. **Invalid Status**: Update a report status to 'REVIEWED' as a STUDENT.
5. **PII Leak**: Read another user's email/private info as a student.
6. **Bypassing Review**: Change `energy` level after report is marked as 'REVIEWED'.
7. **System Injection**: Inject a very large string into `name`.
8. **Invalid ID**: Use a shell-like ID for a document.
9. **Timestamp Manipulation**: Set `createdAt` to a future date.
10. **Unauthorized Feedback**: Add coach feedback to a report as a different coach.
11. **Bulk Scrape**: List all users without filters.
12. **Conflict Injection**: Create reports for the same cycle and user twice.

## Test Runner (firestore.rules.test.ts)
*(I will implement this file after generating initial rules)*
