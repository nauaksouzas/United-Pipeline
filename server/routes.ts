import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authMiddleware, AuthRequest, roleMiddleware } from './auth';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_ksp_override_me';

function getCookieOptions(req: any) {
  const forwardedProto = req.headers?.['x-forwarded-proto'];
  const isSecure = req.secure || forwardedProto === 'https' || process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

import { verifyIdToken } from './firebase-admin';

router.post('/auth/oauth', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    let decoded;
    try {
      decoded = await verifyIdToken(idToken);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    if (!decoded.email) {
      return res.status(400).json({ error: 'Provider did not return an email' });
    }

    const email = decoded.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        error: 'No account found for this email',
        email,
        name: decoded.name,
      });
    }

    if (!user.isActive || user.accountStatus === 'DEACTIVATED') {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    if (user.accountStatus === 'INVITED') {
      return res.status(403).json({
        error: 'Account not yet activated. Use your setup link first.',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, getCookieOptions(req));

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        description: `OAuth login via ${decoded.provider}`,
      },
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

router.post('/setup-account', async (req: any, res: any) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Missing token or password' });

        const user = await prisma.user.findUnique({ where: { inviteToken: token } });
        if (!user || user.accountStatus !== 'INVITED') {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                inviteToken: null,
                accountStatus: 'ACTIVE',
            }
        });

        // Automatically log them in
        const jwtToken = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name }, JWT_SECRET, { expiresIn: '1d' });
        
        res.cookie('token', jwtToken, getCookieOptions(req));

        await prisma.auditLog.create({
           data: { actorId: updatedUser.id, actorRole: updatedUser.role, action: 'ACTIVATE', entityType: 'User', entityId: updatedUser.id, description: `User setup account via token` }
        });

        res.json({ success: true, token: jwtToken });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/signup/options', async (req, res) => {
    try {
        const { programManagerId, pathwayId } = req.query;
        
        const pms = await prisma.user.findMany({ where: { role: 'PROGRAM_MANAGER', accountStatus: 'ACTIVE', isActive: true }, select: { id: true, name: true } });
        
        let coaches: { id: string, name: string }[] = [];
        if (programManagerId) {
            coaches = await prisma.user.findMany({ where: { role: 'COACH', managerId: String(programManagerId), accountStatus: 'ACTIVE', isActive: true }, select: { id: true, name: true } });
        }

        const pathways = await prisma.pathway.findMany({ where: { isActive: true }, select: { id: true, name: true } });

        let classes: { id: string, name: string, instructorName: string }[] = [];
        if (pathwayId) {
            const rawClasses = await prisma.classModel.findMany({ where: { pathwayId: String(pathwayId), isActive: true }, include: { instructor: true } });
            classes = rawClasses.map(c => ({ id: c.id, name: c.name, instructorName: c.instructor?.name || 'Unassigned' }));
        }

        res.json({ pms, coaches, pathways, classes });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, programManagerId, coachId, pathwayId, classIds } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();

        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) return res.status(400).json({ error: 'Email already in use' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = await prisma.$transaction(async (tx) => {
             const user = await tx.user.create({
                 data: {
                     name, email: normalizedEmail, password: hashedPassword,
                     role: 'STUDENT', accountStatus: 'ACTIVE'
                 }
             });

             const profile = await tx.studentProfile.create({
                 data: {
                     userId: user.id,
                     programManagerId,
                     coachId,
                     pathwayId
                 }
             });

             if (classIds && Array.isArray(classIds)) {
                await tx.studentClassEnrollment.createMany({
                   data: classIds.map(cid => ({ classId: cid, studentProfileId: profile.id }))
                });
             }
             
             return user;
        });

        const jwtToken = jwt.sign({ id: student.id, email: student.email, role: student.role, name: student.name }, JWT_SECRET, { expiresIn: '1d' });
        
        res.cookie('token', jwtToken, getCookieOptions(req));

        res.json({ success: true, token: jwtToken });
    } catch(e) {
        res.status(500).json({ error: 'Server error during signup' });
    }
});

router.post('/reports', authMiddleware, roleMiddleware(['STUDENT']), async (req, res) => {
    try {
        const payload = req.body;
        const studentId = (req as any).user?.id;
        
        const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
        if (!profile) return res.status(400).json({ error: 'Student profile not found' });

        const cycle = await prisma.reportCycle.findFirst({
            where: {
                status: 'OPEN',
                OR: [ { pathwayId: profile.pathwayId }, { pathwayId: null } ],
            },
            orderBy: { createdAt: 'desc' }
        });
        
        if (!cycle) {
            return res.status(400).json({ error: 'No open report cycle is available.' });
        }

        const reportData = {
            status: payload.status,
            submittedAt: payload.status === 'SUBMITTED' ? new Date() : null,
            energy: payload.energy,
            mood: payload.mood,
            attendance: payload.attendance,
            confidence: payload.confidence,
            weeklyTopic: payload.weeklyTopic,
            highlights: payload.highlights,
            academicProgress: payload.academicProgress,
            classExperience: payload.classExperience,
            instructorSupport: payload.instructorSupport,
            events: payload.events,
            upcomingEvents: payload.upcomingEvents,
            challengesTags: typeof payload.challengesTags === 'string'
              ? payload.challengesTags
              : JSON.stringify(payload.challengesTags || []),
            challengesText: payload.challengesText,
            needsSupport: !!payload.needsSupport,
            supportNeeded: payload.supportNeeded,
            reflection: payload.reflection,
            goals: payload.goals
        };

        const report = await prisma.weeklyReport.upsert({
            where: {
                studentId_cycleId: { studentId, cycleId: cycle.id }
            },
            update: reportData,
            create: {
                studentId,
                cycleId: cycle.id,
                ...reportData
            }
        });

        if (payload.classRatings && Array.isArray(payload.classRatings)) {
            await prisma.classRating.deleteMany({ where: { reportId: report.id } });
            await prisma.classRating.createMany({
                data: payload.classRatings.map((cr: any) => ({
                    reportId: report.id, classId: cr.classId, rating: cr.rating, comment: cr.comment ?? null
                }))
            });
        }

        if (payload.targetedAnswers && typeof payload.targetedAnswers === 'object') {
            const activeQuestions = await prisma.targetedQuestion.findMany({
                where: {
                    studentId,
                    isActive: true,
                    OR: [{ cycleId: cycle.id }, { cycleId: null }]
                },
                select: { id: true }
            });
            const allowedQuestionIds = new Set(activeQuestions.map(q => q.id));

            for (const [questionId, rawAnswer] of Object.entries(payload.targetedAnswers)) {
                if (!allowedQuestionIds.has(questionId)) continue;
                const answer = String(rawAnswer || '').trim();

                if (!answer) {
                    await prisma.targetedAnswer.deleteMany({ where: { questionId, reportId: report.id } });
                    continue;
                }

                await prisma.targetedAnswer.upsert({
                    where: { questionId_reportId: { questionId, reportId: report.id } },
                    update: { answer },
                    create: { questionId, reportId: report.id, studentId, answer }
                });
            }
        }

        if (payload.status === 'SUBMITTED') {
            const settings = await prisma.appSettings.findFirst() || {} as any;
            const thresholdEnergy = settings.alertThresholdEnergy || 3;
            const thresholdMood = settings.alertThresholdMood || 3;
            const thresholdAttend = settings.alertThresholdAttend || 70;
            const thresholdConf = settings.alertThresholdConf || 3;

            let alertsTriggered = 0;
            const createAlertIfNew = async (type: string, severity: string, description: string) => {
                const existing = await prisma.alert.findFirst({
                    where: { studentId, description, resolved: false }
                });
                if (!existing) {
                    alertsTriggered++;
                    await prisma.alert.create({
                        data: { studentId, type, severity, description }
                    });
                }
            };

            if (payload.energy < thresholdEnergy) await createAlertIfNew('LOW_ENERGY', 'MEDIUM', 'Student reported low energy');
            if (payload.mood < thresholdMood) await createAlertIfNew('LOW_MOOD', 'MEDIUM', 'Student reported low mood');
            if (payload.attendance < thresholdAttend) await createAlertIfNew('LOW_ATTENDANCE', 'HIGH', 'Attendance dropped below threshold');
            if (payload.confidence < thresholdConf) await createAlertIfNew('LOW_CONFIDENCE', 'MEDIUM', 'Student reported low confidence');
            if (payload.needsSupport) await createAlertIfNew('SUPPORT_NEEDED', 'HIGH', 'Student explicitly requested support');
            
            const hasBeginning = payload.classRatings?.some((cr: any) => cr.rating === 'BEGINNING');
            if (hasBeginning) await createAlertIfNew('LOW_PERFORMANCE', 'HIGH', 'Student reported BEGINNING in a class');
            
            let parsedTags = [];
            try { parsedTags = JSON.parse(payload.challengesTags || '[]'); } catch(e){}
            if (parsedTags.length > 2) await createAlertIfNew('CHALLENGE_FLAGGED', 'MEDIUM', 'Multiple challenges flagged');

            if (alertsTriggered >= 3) {
                await prisma.alert.updateMany({
                   where: { studentId, resolved: false },
                   data: { severity: 'CRITICAL' }
                });
            }

            await prisma.auditLog.create({
                data: { actorId: studentId, actorRole: 'STUDENT', action: 'STATUS_CHANGE', entityType: 'WeeklyReport', entityId: report.id, description: 'Submitted weekly report' }
            });
        }

        res.json({ id: report.id });
    } catch(e: any) {
        res.status(500).json({ error: e.message || 'Server error' });
    }
});
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || user.accountStatus !== 'ACTIVE' || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    
    res.cookie('token', token, getCookieOptions(req));

    await prisma.auditLog.create({
      data: {
        actorId: user.id, actorRole: user.role, action: 'LOGIN',
        entityType: 'User', entityId: user.id, description: 'User login'
      }
    });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token', getCookieOptions(req));
  res.json({ success: true });
});

router.get('/auth/session', authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as any).user.id }, select: { id: true, email: true, name: true, role: true } });
  if (!user) return res.status(401).json({ error: 'Invalid' });
  res.json({ user });
});

router.get('/dashboard-redirect', authMiddleware, (req: AuthRequest, res) => {
    switch ((req as any).user.role) {
        case 'ADMIN': return res.redirect('/admin');
        case 'PROGRAM_MANAGER': return res.redirect('/pm');
        case 'INSTRUCTOR': return res.redirect('/instructor');
        case 'COACH': return res.redirect('/coach');
        case 'STUDENT': return res.redirect('/student');
        default: return res.redirect('/');
    }
});

// --- ADMIN ---
router.get('/admin/invite', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const pms = await prisma.user.findMany({
            where: { role: 'PROGRAM_MANAGER' },
            select: { id: true, name: true, email: true, accountStatus: true, inviteToken: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(pms);
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

import { generateDocx, generatePdf } from './exports';

router.get('/reports/export-docx', authMiddleware, async (req: any, res: any) => {
    try {
        const { id } = req.query;
        const report = await prisma.weeklyReport.findUnique({
            where: { id: String(id) },
            include: { student: { include: { studentProfile: { include: { classEnrollments: { include: { classModel: true } } } } } }, cycle: true, classRatings: true }
        });
        if (!report) return res.status(404).json({ error: 'Not found' });

        const reqUser = req.user;
        let authorized = false;
        if (reqUser.role === 'ADMIN') authorized = true;
        else if (reqUser.role === 'STUDENT' && report.studentId === reqUser.id) authorized = true;
        else if (reqUser.role === 'COACH' && report.student.studentProfile?.coachId === reqUser.id) authorized = true;
        else if (reqUser.role === 'PROGRAM_MANAGER' && report.student.studentProfile?.programManagerId === reqUser.id) authorized = true;
        else if (reqUser.role === 'INSTRUCTOR') {
             const enrollments = report.student.studentProfile?.classEnrollments || [];
             authorized = enrollments.some(ce => ce.classModel?.instructorId === reqUser.id);
        }

        if (!authorized) return res.status(403).json({ error: 'Unauthorized' });

        const buffer = await generateDocx(report);
        const filename = `EchoTrack_Report_${report.student.name.replace(/ /g, '_')}.docx`;
        
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'EXPORT', entityType: 'WeeklyReport', entityId: report.id, description: 'Exported DOCX' }
        });

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/reports/export-pdf', authMiddleware, async (req: any, res: any) => {
    try {
        const { id } = req.query;
        const report = await prisma.weeklyReport.findUnique({
            where: { id: String(id) },
            include: { student: { include: { studentProfile: { include: { classEnrollments: { include: { classModel: true } } } } } }, cycle: true, classRatings: true }
        });
        if (!report) return res.status(404).json({ error: 'Not found' });

        const reqUser = req.user;
        let authorized = false;
        if (reqUser.role === 'ADMIN') authorized = true;
        else if (reqUser.role === 'STUDENT' && report.studentId === reqUser.id) authorized = true;
        else if (reqUser.role === 'COACH' && report.student.studentProfile?.coachId === reqUser.id) authorized = true;
        else if (reqUser.role === 'PROGRAM_MANAGER' && report.student.studentProfile?.programManagerId === reqUser.id) authorized = true;
        else if (reqUser.role === 'INSTRUCTOR') {
             const enrollments = report.student.studentProfile?.classEnrollments || [];
             authorized = enrollments.some(ce => ce.classModel?.instructorId === reqUser.id);
        }

        if (!authorized) return res.status(403).json({ error: 'Unauthorized' });

        const stream = await generatePdf(report);
        const filename = `EchoTrack_Report_${report.student.name.replace(/ /g, '_')}.pdf`;
        
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'EXPORT', entityType: 'WeeklyReport', entityId: report.id, description: 'Exported PDF' }
        });

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        stream.pipe(res);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/invite', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const { name, email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) return res.status(400).json({ error: 'User already exists' });
        
        const inviteToken = crypto.randomBytes(16).toString('hex');
        
        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                role: 'PROGRAM_MANAGER',
                accountStatus: 'INVITED',
                isActive: true,
                password: '',
                inviteToken
            }
        });
        
        await prisma.auditLog.create({
           data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'CREATE', entityType: 'USER', entityId: user.id, description: `Admin invited Program Manager ${name}` }
        });

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountStatus: user.accountStatus
            },
            setupLink: `/setup-account?token=${inviteToken}`
        });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/admin/invite', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.query;
        await prisma.user.update({
            where: { id: String(id) },
            data: { accountStatus: 'DEACTIVATED', isActive: false }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/analytics', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', isActive: true } });
        const totalActiveUsers = await prisma.user.count({ where: { isActive: true } });
        
        let cycle = await prisma.reportCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } });
        let submissionRate = 0;
        let reviewedRate = 0;
        let studentsNeedingSupport = 0;

        if (cycle) {
            const submittedCount = await prisma.weeklyReport.count({ where: { cycleId: cycle.id } });
            const reviewedCount = await prisma.weeklyReport.count({ where: { cycleId: cycle.id, status: 'REVIEWED' } });
            if (totalStudents > 0) submissionRate = Math.round((submittedCount / totalStudents) * 100);
            if (submittedCount > 0) reviewedRate = Math.round((reviewedCount / submittedCount) * 100);
        }

        const openCyclesPastDue = await prisma.reportCycle.count({ where: { status: 'OPEN', endDate: { lt: new Date() } } });
        // overdue reports simplification
        const overdueReports = openCyclesPastDue * totalStudents; // roughly

        studentsNeedingSupport = await (prisma as any).$queryRaw`SELECT COUNT(DISTINCT "studentId") as cnt FROM "WeeklyReport" WHERE "needsSupport" = 1`;
        if (typeof studentsNeedingSupport === 'object' && (studentsNeedingSupport as any)?.[0]?.cnt) {
            studentsNeedingSupport = Number((studentsNeedingSupport as any)[0].cnt);
        } else {
             const reports = await prisma.weeklyReport.findMany({ where: { needsSupport: true }, select: { studentId: true } });
             const uniqueStudents = new Set(reports.map(r => r.studentId));
             studentsNeedingSupport = uniqueStudents.size;
        }

        const activeAlertsCount = await prisma.alert.count({ where: { resolved: false } });

        const pathways = await prisma.pathway.findMany({ include: { studentProfiles: true } });

        const typeGroups = await prisma.alert.groupBy({ by: ['type'], _count: { id: true } });
        const alertDistribution = typeGroups.map(g => ({ type: g.type, count: g._count.id }));

        res.json({
            totalStudents,
            totalActiveUsers,
            totalProgramManagers: await prisma.user.count({ where: { role: 'PROGRAM_MANAGER', isActive: true } }),
            totalPathways: await prisma.pathway.count({ where: { isActive: true } }),
            totalClasses: await prisma.classModel.count({ where: { isActive: true } }),
            submittedReportsThisCycle: cycle ? await prisma.weeklyReport.count({ where: { cycleId: cycle.id } }) : 0,
            submissionRate,
            reviewedRate,
            overdueReports,
            studentsNeedingSupport,
            activeAlerts: activeAlertsCount,
            alertDistribution,
            // Provide empty arrays instead of random numbers
            classPerformance: { overall: { EXCEEDING: 0, MEETING: 0, APPROACHING: 0, BEGINNING: 0 }, byPathway: [] },
            submissionTrend: [],
            topCoaches: [],
            topPathways: [],
            classesNeedingAttention: [],
            recent30DaySubmissions: [],
            recentActivity: []
        });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/pathways', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const pathways = await prisma.pathway.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: { classes: true, studentProfiles: true }
                }
            }
        });
        const mapped = pathways.map(p => ({
            ...p,
            classesCount: p._count.classes,
            studentsCount: p._count.studentProfiles,
            instructorsCount: 0 // Simplification since instructor works slightly differently
        }));
        res.json(mapped);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/pathways', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { name, description } = req.body;
        const pathway = await prisma.pathway.create({
            data: { name, description }
        });
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'CREATE', entityType: 'Pathway', entityId: pathway.id, description: `Created pathway ${name}` }
        });
        res.json(pathway);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/admin/pathways', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { id } = req.query;
        await prisma.pathway.update({
            where: { id: String(id) },
            data: { isActive: false }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/users', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, accountStatus: true },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/users', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    // Just map to PM invite for now or handle appropriately
    return res.status(400).json({ error: 'Use PM Invite instead' });
});

router.patch('/admin/users/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        await prisma.user.update({
            where: { id: String(id) },
            data: { isActive, accountStatus: isActive ? 'ACTIVE' : 'DEACTIVATED' }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/settings', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        let settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
        if (!settings) {
            settings = await prisma.appSettings.create({ data: { id: 'singleton' } });
        }
        res.json(settings);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/admin/settings', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const data = req.body;
        const updated = await prisma.appSettings.upsert({
            where: { id: 'singleton' },
            create: {
               id: 'singleton',
               organizationName: data.organizationName,
               productName: data.productName,
               primaryColor: data.primaryColor,
               weeklyDueDay: data.weeklyDueDay !== undefined ? parseInt(data.weeklyDueDay) : undefined,
               weeklyDueHour: data.weeklyDueHour !== undefined ? parseInt(data.weeklyDueHour) : undefined,
               autoCloseCycles: data.autoCloseCycles,
               alertThresholdEnergy: data.alertThresholdEnergy !== undefined ? parseInt(data.alertThresholdEnergy) : undefined,
               alertThresholdMood: data.alertThresholdMood !== undefined ? parseInt(data.alertThresholdMood) : undefined,
               alertThresholdAttend: data.alertThresholdAttend !== undefined ? parseInt(data.alertThresholdAttend) : undefined,
               alertThresholdConf: data.alertThresholdConf !== undefined ? parseInt(data.alertThresholdConf) : undefined,
               outlookEnabled: data.outlookEnabled,
               brightspaceEnabled: data.brightspaceEnabled
            },
            update: {
               organizationName: data.organizationName,
               productName: data.productName,
               primaryColor: data.primaryColor,
               weeklyDueDay: data.weeklyDueDay !== undefined ? parseInt(data.weeklyDueDay) : undefined,
               weeklyDueHour: data.weeklyDueHour !== undefined ? parseInt(data.weeklyDueHour) : undefined,
               autoCloseCycles: data.autoCloseCycles,
               alertThresholdEnergy: data.alertThresholdEnergy !== undefined ? parseInt(data.alertThresholdEnergy) : undefined,
               alertThresholdMood: data.alertThresholdMood !== undefined ? parseInt(data.alertThresholdMood) : undefined,
               alertThresholdAttend: data.alertThresholdAttend !== undefined ? parseInt(data.alertThresholdAttend) : undefined,
               alertThresholdConf: data.alertThresholdConf !== undefined ? parseInt(data.alertThresholdConf) : undefined,
               outlookEnabled: data.outlookEnabled,
               brightspaceEnabled: data.brightspaceEnabled
            }
        });
        
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'UPDATE', entityType: 'Settings', entityId: 'singleton', description: 'Updated app settings' }
        });
        res.json(updated);
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/classes', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const classes = await prisma.classModel.findMany({
            where: { isActive: true },
            include: { pathway: true, instructor: true }
        });
        res.json(classes);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/classes', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { name, pathwayId, instructorId, schedule } = req.body;
        const cls = await prisma.classModel.create({
            data: { name, pathwayId, instructorId, schedule }
        });
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'CREATE', entityType: 'Class', entityId: cls.id, description: `Created class ${name}` }
        });
        res.json(cls);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/admin/classes', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { id } = req.query;
        await prisma.classModel.update({
            where: { id: String(id) },
            data: { isActive: false }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/instructors', authMiddleware, roleMiddleware(['ADMIN', 'PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const instructors = await prisma.user.findMany({
            where: { role: 'INSTRUCTOR', isActive: true },
            select: { id: true, name: true }
        });
        res.json(instructors);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/communities', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const communities = await prisma.community.findMany({
            where: { isActive: true },
            include: { programManager: true, _count: { select: { studentProfiles: true } } }
        });
        res.json(communities.map(c => ({...c, studentsCount: c._count.studentProfiles})));
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/communities', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { name, description, programManagerId } = req.body;
        const comm = await prisma.community.create({
            data: { name, description, programManagerId }
        });
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'CREATE', entityType: 'Community', entityId: comm.id, description: `Created community: ${comm.name}` }
        });
        res.json(comm);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/admin/communities', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { id } = req.query;
        await prisma.community.update({
            where: { id: String(id) },
            data: { isActive: false }
        });
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'DELETE', entityType: 'Community', entityId: String(id), description: `Deactivated community` }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/cycles', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const cycles = await prisma.reportCycle.findMany({
            include: { pathway: true, _count: { select: { weeklyReports: true } } }
        });
        res.json(cycles.map(c => ({...c, reportsCount: c._count.weeklyReports})));
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/admin/cycles', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { name, startDate, endDate, status, pathwayId } = req.body;
        
        if (status === 'OPEN') {
            const hasOpen = await prisma.reportCycle.findFirst({
                where: { status: 'OPEN', pathwayId }
            });
            if (hasOpen) return res.status(400).json({ error: 'An OPEN cycle already exists for this scope' });
        }
        
        const cycle = await prisma.reportCycle.create({
            data: { name, startDate: new Date(startDate), endDate: new Date(endDate), status, pathwayId }
        });
        await prisma.auditLog.create({
            data: { actorId: (req as any).user?.id, actorRole: (req as any).user?.role, action: 'CREATE', entityType: 'ReportCycle', entityId: cycle.id, description: `Created cycle: ${cycle.name}` }
        });
        res.json(cycle);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/admin/cycles/:id', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (status === 'OPEN') {
             const cycle = await prisma.reportCycle.findUnique({ where: { id: String(id) }});
             const hasOpen = await prisma.reportCycle.findFirst({
                 where: { status: 'OPEN', pathwayId: cycle?.pathwayId }
             });
             if (hasOpen && hasOpen.id !== id) return res.status(400).json({ error: 'An OPEN cycle already exists' });
        }
        
        await prisma.reportCycle.update({
            where: { id: String(id) },
            data: { status }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/audit', authMiddleware, roleMiddleware(['ADMIN']), async (req: any, res: any) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/targeted-questions', authMiddleware, async (req: any, res: any) => {
    try {
        // Mock returning questions
        const questions = await prisma.targetedQuestion.findMany({
            where: { isActive: true },
            include: { cycle: true }
        });
        res.json(questions);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/targeted-questions', authMiddleware, roleMiddleware(['ADMIN', 'PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const { question, studentId, cycleId } = req.body;
        const created = await prisma.targetedQuestion.create({
            data: { question, studentId, cycleId, creatorId: (req as any).user?.id }
        });
        res.json(created);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/targeted-questions', authMiddleware, roleMiddleware(['ADMIN', 'PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const { id } = req.query;
        await prisma.targetedQuestion.update({
            where: { id: String(id) },
            data: { isActive: false }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/pm/dashboard', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT', studentProfile: { programManagerId: (req as any).user?.id } },
            include: { weeklyReports: true }
        });
        const alerts = await prisma.alert.findMany({
            where: { resolved: false, student: { studentProfile: { programManagerId: (req as any).user?.id } } },
            include: { student: true }
        });
        const studentsWithReports = students.map(s => ({
            ...s,
            reports: s.weeklyReports
        }));
        res.json({ students: studentsWithReports, alerts });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/student/reports', authMiddleware, roleMiddleware(['STUDENT']), async (req, res) => {
    try {
        const reports = await prisma.weeklyReport.findMany({
            where: { studentId: (req as any).user?.id },
            include: { cycle: true },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(reports);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.patch('/reports/:id/review', authMiddleware, roleMiddleware(['ADMIN', 'PROGRAM_MANAGER', 'COACH']), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.weeklyReport.update({
            where: { id },
            data: { status: 'REVIEWED' }
        });
        res.json({ success: true });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/admin/reports', authMiddleware, roleMiddleware(['ADMIN']), async (req, res) => {
    try {
        const reports = await prisma.weeklyReport.findMany({
            include: { student: true, cycle: true },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(reports);
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/coach/dashboard', authMiddleware, roleMiddleware(['COACH']), async (req, res) => {
    try {
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT', studentProfile: { coachId: (req as any).user?.id } }
        });
        const reports = await prisma.weeklyReport.findMany({
            where: { student: { studentProfile: { coachId: (req as any).user?.id } } },
            include: { student: true }
        });
        res.json({ students, reports });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ======== STUDENT ========
router.get('/student/me', authMiddleware, roleMiddleware(['STUDENT']), async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { studentProfile: { include: { programManager: true, coach: true, pathway: true, classEnrollments: { include: { classModel: true } } } } }
        });
        const pathwayId = user?.studentProfile?.pathwayId || null;
        const openCycle = await prisma.reportCycle.findFirst({
            where: {
                status: 'OPEN',
                OR: [{ pathwayId }, { pathwayId: null }]
            },
            orderBy: { createdAt: 'desc' }
        });
        let currentReport = null;
        if (openCycle) {
            currentReport = await prisma.weeklyReport.findFirst({ where: { studentId: req.user.id, cycleId: openCycle.id } });
        }
        res.json({ ...user, currentCycle: openCycle, currentReport });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/student/classes', authMiddleware, roleMiddleware(['STUDENT']), async (req: any, res: any) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { studentProfile: { include: { classEnrollments: { include: { classModel: { include: { instructor: true } } } } } } } });
        res.json(user?.studentProfile?.classEnrollments.map((e: any) => e.classModel) || []);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/student/report-context', authMiddleware, roleMiddleware(['STUDENT']), async (req: any, res: any) => {
    try {
        const studentId = req.user.id;
        const profile = await prisma.studentProfile.findUnique({
            where: { userId: studentId },
            include: {
                classEnrollments: {
                    where: { isActive: true },
                    include: { classModel: { include: { instructor: true } } }
                }
            }
        });
        if (!profile) return res.status(400).json({ error: 'Student profile not found' });

        const currentCycle = await prisma.reportCycle.findFirst({
            where: {
                status: 'OPEN',
                OR: [{ pathwayId: profile.pathwayId }, { pathwayId: null }]
            },
            orderBy: { createdAt: 'desc' }
        });

        const currentReport = currentCycle ? await prisma.weeklyReport.findUnique({
            where: { studentId_cycleId: { studentId, cycleId: currentCycle.id } },
            include: { classRatings: true, targetedAnswers: true }
        }) : null;

        const targetedQuestions = currentCycle ? await prisma.targetedQuestion.findMany({
            where: {
                studentId,
                isActive: true,
                OR: [{ cycleId: currentCycle.id }, { cycleId: null }]
            },
            orderBy: { createdAt: 'asc' }
        }) : [];

        res.json({
            classes: profile.classEnrollments.map((e: any) => e.classModel).filter(Boolean),
            currentCycle,
            currentReport,
            targetedQuestions
        });
    } catch(e) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/student/history', authMiddleware, roleMiddleware(['STUDENT']), async (req: any, res: any) => {
    try {
        const reports = await prisma.weeklyReport.findMany({
            where: { studentId: req.user.id },
            include: { cycle: true, classRatings: { include: { classModel: true } } },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(reports);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

// ======== COACH ========
router.get('/coach/students', authMiddleware, roleMiddleware(['COACH']), async (req: any, res: any) => {
    try {
        const students = await prisma.user.findMany({
            where: { role: 'STUDENT', studentProfile: { coachId: req.user.id } },
            include: { studentProfile: { include: { pathway: true } } }
        });
        res.json(students);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/coach/reports', authMiddleware, roleMiddleware(['COACH']), async (req: any, res: any) => {
    try {
        const reports = await prisma.weeklyReport.findMany({
            where: { student: { studentProfile: { coachId: req.user.id } } },
            include: { student: true, cycle: true, classRatings: true },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(reports);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/coach/alerts', authMiddleware, roleMiddleware(['COACH']), async (req: any, res: any) => {
    try {
        const alerts = await prisma.alert.findMany({
            where: { resolved: false, student: { studentProfile: { coachId: req.user.id } } },
            include: { student: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(alerts);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/alerts/:id/resolve', authMiddleware, roleMiddleware(['ADMIN', 'PROGRAM_MANAGER', 'COACH']), async (req: any, res: any) => {
    try {
        await prisma.alert.update({ where: { id: req.params.id }, data: { resolved: true } });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

// ======== INSTRUCTOR ========
router.get('/instructor/dashboard', authMiddleware, roleMiddleware(['INSTRUCTOR']), async (req: any, res: any) => {
    try {
        const classes = await prisma.classModel.findMany({ where: { instructorId: req.user.id, isActive: true }, include: { _count: { select: { studentClassEnrollments: true } } } });
        const ratings = await prisma.classRating.findMany({ where: { classModel: { instructorId: req.user.id } }, include: { classModel: true } });
        res.json({ classes, ratings });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/instructor/classes', authMiddleware, roleMiddleware(['INSTRUCTOR']), async (req: any, res: any) => {
    try {
        const classes = await prisma.classModel.findMany({ where: { instructorId: req.user.id, isActive: true }, include: { studentClassEnrollments: { include: { studentProfile: { include: { user: true } } } } } });
        res.json(classes);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/instructor/reports', authMiddleware, roleMiddleware(['INSTRUCTOR']), async (req: any, res: any) => {
    try {
        const myClasses = await prisma.classModel.findMany({ where: { instructorId: req.user.id } });
        const classIds = myClasses.map(c => c.id);
        const ratings = await prisma.classRating.findMany({
            where: { classId: { in: classIds } },
            include: { report: { include: { student: true, cycle: true } }, classModel: true }
        });
        const reports = new Map();
        for (const r of ratings) {
            if (!reports.has(r.reportId)) reports.set(r.reportId, r.report);
        }
        res.json(Array.from(reports.values()));
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

// ======== PM ========
router.get('/pm/students', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const students = await prisma.user.findMany({ where: { role: 'STUDENT', studentProfile: { programManagerId: req.user.id } }, include: { studentProfile: { include: { pathway: true, coach: true } } } });
        res.json(students);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/pm/staff', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const staff = await prisma.user.findMany({ where: { role: { in: ['COACH', 'INSTRUCTOR'] }, isActive: true } });
        res.json(staff);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/pm/staff', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const { email, role, name } = req.body;
        const normalizedEmail = String(email).toLowerCase().trim();
        
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existing) return res.status(400).json({ error: 'User already exists' });

        if (role !== 'COACH' && role !== 'INSTRUCTOR') {
            return res.status(400).json({ error: 'Invalid role for PM to invite' });
        }
        
        const inviteToken = crypto.randomBytes(16).toString('hex');
        const user = await prisma.user.create({
            data: {
                name,
                email: normalizedEmail,
                role,
                accountStatus: 'INVITED',
                isActive: true,
                password: '',
                inviteToken,
                managerId: req.user.id
            }
        });

        await prisma.auditLog.create({
            data: { actorId: req.user.id, actorRole: req.user.role, action: 'CREATE', entityType: 'User', entityId: user.id, description: `PM invited ${role} ${name}` }
        });

        res.json({ success: true, setupLink: `/setup-account?token=${inviteToken}` });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/pm/staff', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        await prisma.user.update({ where: { id: req.query.id as string }, data: { isActive: false } });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/pm/communities', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        res.json(await prisma.community.findMany({ include: { programManager: true } }));
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/pm/communities', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        res.json(await prisma.community.create({ data: { name: req.body.name, programManagerId: req.user.id } }));
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/pm/communities', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        await prisma.community.delete({ where: { id: req.query.id as string } });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/pm/reports', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const reports = await prisma.weeklyReport.findMany({
            where: { student: { studentProfile: { programManagerId: req.user.id } } },
            include: { student: true, cycle: true, classRatings: true },
            orderBy: { submittedAt: 'desc' }
        });
        res.json(reports);
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/pm/analytics', authMiddleware, roleMiddleware(['PROGRAM_MANAGER']), async (req: any, res: any) => {
    try {
        const pmId = req.user.id;
        const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', isActive: true, studentProfile: { programManagerId: pmId } } });
        
        let cycle = await prisma.reportCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' } });
        let submissionRate = 0;
        let activeAlerts = 0;

        if (cycle) {
            const submittedCount = await prisma.weeklyReport.count({ 
                where: { cycleId: cycle.id, student: { studentProfile: { programManagerId: pmId } } } 
            });
            if (totalStudents > 0) submissionRate = Math.round((submittedCount / totalStudents) * 100);
        }

        activeAlerts = await prisma.alert.count({ 
            where: { resolved: false, student: { studentProfile: { programManagerId: pmId } } } 
        });

        res.json({ totalStudents, submissionRate, activeAlerts, classPerformance: {}, alertDistribution: [] }); 
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/reports/:id/feedback', authMiddleware, roleMiddleware(['ADMIN', 'PROGRAM_MANAGER', 'COACH']), async (req: any, res: any) => {
    try {
        const { text } = req.body;
        const feedback = await prisma.coachFeedback.create({
            data: {
                reportId: req.params.id,
                coachId: req.user.id,
                feedback: text
            }
        });
        res.json({ success: true, text, feedback });
    } catch(e) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
