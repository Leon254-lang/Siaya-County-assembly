const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const multer = require('multer');
const Bill = require('../models/Bill');
const Meeting = require('../models/Meeting');
const Committee = require('../models/Committee');
const Document = require('../models/Document');
const Hansard = require('../models/Hansard');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION;

const transcribeWithOpenAI = async (fileBuffer, mimeType = 'audio/webm') => {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const formData = new FormData();
  const filename = `audio-${Date.now()}.webm`;
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI transcription failed: ${errorText}`);
  }

  const payload = await response.json();
  return payload?.text || '';
};

const synthesizeWithOpenAI = async (text) => {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI speech synthesis failed: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const synthesizeWithAzure = async (text) => {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error('Missing Azure speech configuration');
  }

  const response = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3'
    },
    body: `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' name='en-US-JennyNeural'>${text}</voice></speak>`
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure speech synthesis failed: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

const STOP_WORDS = new Set([
  'the','a','an','of','and','or','to','in','on','for','with','by','as','is','it','its','this','that','these','those','from','into','about','what','which','when','where','who','why','how','show','find','search','list','summarize','summary','brief','latest','recent','assembly','county','records','data','using','please','tell','me','my','we','our','can','could','would','should','they','them','there','here','be','are','was','were','has','have','had','been','at','up','out','over','under','after','before','within','across','about'
]);

const KNOWLEDGE_CATEGORIES = [
  {
    name: 'Assembly Governance',
    description: 'Assembly history, structure, standing orders, leadership roles, departments, procedures, and administrative workflows.',
    keywords: ['speaker', 'clerk', 'mca', 'assembly', 'governance', 'standing', 'orders', 'department', 'committee', 'roles'],
    knowledgeArea: 'Assembly',
    subtopics: ['History', 'Structure', 'Departments', 'Procedures']
  },
  {
    name: 'Legislative Process',
    description: 'Bills, motions, resolutions, questions, petitions, acts, committee review, and legislative decisions.',
    keywords: ['bill', 'bills', 'motion', 'motions', 'resolution', 'resolutions', 'question', 'questions', 'petition', 'petitions', 'act', 'acts', 'legislative', 'debate', 'vote', 'voting'],
    knowledgeArea: 'Legislation',
    subtopics: ['Bills', 'Motions', 'Acts', 'Resolutions']
  },
  {
    name: 'Meetings and Proceedings',
    description: 'Meeting schedules, agendas, attendance, minutes, resolutions, and action items.',
    keywords: ['meeting', 'meetings', 'agenda', 'minutes', 'attendance', 'session', 'sitting', 'action', 'resolution', 'outcome'],
    knowledgeArea: 'Meetings',
    subtopics: ['Agendas', 'Minutes', 'Attendance']
  },
  {
    name: 'Financial and Procurement',
    description: 'Budget documents, expenditure reports, implementation reports, and procurement information.',
    keywords: ['budget', 'finance', 'procurement', 'expenditure', 'report', 'financial', 'cost', 'spending', 'award', 'contract'],
    knowledgeArea: 'Finance',
    subtopics: ['Budgets', 'Reports']
  },
  {
    name: 'Public Participation',
    description: 'Public submissions, notices, feedback, responses, and participation records.',
    keywords: ['public', 'participation', 'notice', 'feedback', 'submission', 'citizen', 'response', 'complaint', 'engagement'],
    knowledgeArea: 'Public_Participation',
    subtopics: ['Notices', 'Submissions', 'Reports']
  }
];

const KNOWLEDGE_BASE_TREE = {
  'ICAMS AI KNOWLEDGE BASE': {
    Assembly: {
      History: {},
      Structure: {},
      Departments: {},
      Procedures: {}
    },
    Legislation: {
      Bills: {},
      Motions: {},
      Acts: {},
      Resolutions: {}
    },
    Committees: {
      Reports: {},
      Minutes: {},
      Proceedings: {}
    },
    Meetings: {
      Agendas: {},
      Minutes: {},
      Attendance: {}
    },
    Finance: {
      Budgets: {},
      Reports: {}
    },
    Public_Participation: {
      Notices: {},
      Submissions: {},
      Reports: {}
    }
  }
};

const KNOWLEDGE_AREA_TO_CATEGORY = {
  Assembly: 'Assembly Governance',
  Legislation: 'Legislative Process',
  Meetings: 'Meetings and Proceedings',
  Finance: 'Financial and Procurement',
  Public_Participation: 'Public Participation'
};

const ALL_KNOWLEDGE_CATEGORIES = new Set(KNOWLEDGE_CATEGORIES.map((category) => category.name));

const ICAMS_ASSISTANT_PERSONA = `You are ICAMS AI, an Intelligent County Assembly Assistant for the County Assembly Management System.

You answer questions using authorized Assembly documents and database information only.
Never invent Assembly information.
If information cannot be found, clearly state: "I could not find this information in the available Assembly records."
Always respect the user's access permissions.
For document-based answers, provide the document name and relevant section/page where available.
Never expose confidential information to unauthorized users.
You should sound professional, helpful, concise, and trustworthy.
Always ground your answers in the available records and cite the relevant record or document when present.`;

const ROLE_KNOWLEDGE_ACCESS = {
  Citizen: new Set(['Assembly Governance', 'Legislative Process', 'Meetings and Proceedings', 'Public Participation']),
  MCA: new Set(['Assembly Governance', 'Legislative Process', 'Meetings and Proceedings', 'Public Participation', 'Financial and Procurement']),
  'Committee Officer': new Set(['Assembly Governance', 'Meetings and Proceedings', 'Legislative Process']),
  'Committee Member': new Set(['Assembly Governance', 'Meetings and Proceedings', 'Legislative Process']),
  Clerk: new Set(['Assembly Governance', 'Legislative Process', 'Meetings and Proceedings', 'Financial and Procurement', 'Public Participation']),
  Admin: new Set(['Assembly Governance', 'Legislative Process', 'Meetings and Proceedings', 'Financial and Procurement', 'Public Participation']),
  'ICT Admin': new Set(ALL_KNOWLEDGE_CATEGORIES),
  'Super Admin': new Set(ALL_KNOWLEDGE_CATEGORIES),
  'ICT/Super Admin': new Set(ALL_KNOWLEDGE_CATEGORIES),
  default: new Set(['Assembly Governance', 'Legislative Process', 'Meetings and Proceedings', 'Public Participation'])
};

const normalizeRoleName = (value) => {
  if (!value) return 'Citizen';

  const normalized = String(value).trim();
  if (!normalized) return 'Citizen';

  const lookup = normalized.toLowerCase().replace(/[^a-z0-9\s/]+/g, ' ').replace(/\s+/g, ' ').trim();

  const directMap = {
    citizen: 'Citizen',
    'public citizen': 'Citizen',
    mca: 'MCA',
    committee: 'Committee Officer',
    'committee officer': 'Committee Officer',
    'committee member': 'Committee Member',
    clerk: 'Clerk',
    admin: 'Admin',
    administrator: 'Admin',
    'ict admin': 'ICT Admin',
    'ict / super admin': 'ICT/Super Admin',
    'ict/super admin': 'ICT/Super Admin',
    'super admin': 'Super Admin',
    'superadmin': 'Super Admin'
  };

  return directMap[lookup] || normalized;
};

const getRoleKnowledgeAccess = (roleName) => {
  const normalizedRole = normalizeRoleName(roleName);
  return ROLE_KNOWLEDGE_ACCESS[normalizedRole] || ROLE_KNOWLEDGE_ACCESS.default;
};

const filterEvidenceByRole = (records = [], roleName = 'Citizen') => {
  const allowed = getRoleKnowledgeAccess(roleName);

  return (records || []).filter((record) => {
    const category = record?.category || record?.type || 'Assembly Governance';
    const knowledgeArea = Object.keys(KNOWLEDGE_AREA_TO_CATEGORY).find((area) => KNOWLEDGE_AREA_TO_CATEGORY[area] === category);
    return allowed.has(category) || (knowledgeArea && allowed.has(KNOWLEDGE_AREA_TO_CATEGORY[knowledgeArea])) || (record?.metadata && Object.values(record.metadata).some((value) => typeof value === 'string' && allowed.has(value)));
  });
};

const getKnowledgeBaseTree = () => ({
  ...JSON.parse(JSON.stringify(KNOWLEDGE_BASE_TREE)),
  categories: KNOWLEDGE_CATEGORIES.map((category) => ({
    ...category,
    knowledgeArea: category.knowledgeArea,
    subtopics: category.subtopics
  }))
});

const ACTION_PERMISSION_MAP = {
  schedule_meeting: ['Clerk', 'Committee Officer', 'Super Admin'],
  list_overdue_action_items: ['Clerk', 'Committee Officer', 'Super Admin', 'MCA'],
  generate_attendance_report: ['Clerk', 'Committee Officer', 'Super Admin', 'MCA']
};

const detectAssistantAction = (question = '') => {
  const q = normalizePhrase(question).toLowerCase();

  if (/(schedule|create|book).*(meeting|session)/.test(q)) {
    return {
      type: 'schedule_meeting',
      name: 'Schedule Meeting',
      executionPlan: ['Validate permissions', 'Create meeting', 'Notify members', 'Add calendar event', 'Audit action'],
      question
    };
  }

  if (/(show|list|find).*(overdue.*action item|overdue.*action items|action items.*overdue)/.test(q) || /overdue.*committee.*action/i.test(q)) {
    return {
      type: 'list_overdue_action_items',
      name: 'List Overdue Action Items',
      executionPlan: ['Validate permissions', 'Query outstanding tasks', 'Return actionable list', 'Audit action'],
      question
    };
  }

  if (/(generate|create|prepare).*(report.*attendance|attendance.*report|mca.*attendance)/.test(q) || /attendance.*august|report.*august.*attendance/.test(q)) {
    return {
      type: 'generate_attendance_report',
      name: 'Generate Attendance Report',
      executionPlan: ['Validate permissions', 'Query attendance records', 'Aggregate by member and month', 'Generate report', 'Audit action'],
      question
    };
  }

  return null;
};

const parseMeetingSchedulingDetails = (question = '') => {
  const q = normalizePhrase(question);
  const dayMatch = q.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  const dateMatch = q.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)|\d{4}-\d{2}-\d{2})/i);
  const timeMatch = q.match(/at\s+(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)/i);
  const venueMatch = q.match(/(in|at|venue|room)\s+([a-z0-9 .-]+)/i);

  let scheduledDate = null;
  if (dayMatch) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const target = dayNames.indexOf(dayMatch[1].toLowerCase());
    if (target >= 0) {
      const now = new Date();
      const diff = (target - now.getDay() + 7) % 7 || 7;
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + diff);
      scheduledDate = nextDate;
    }
  } else if (dateMatch) {
    scheduledDate = new Date(dateMatch[0]);
  }

  return {
    day: dayMatch ? dayMatch[1] : null,
    date: scheduledDate,
    time: timeMatch ? timeMatch[1] : null,
    venue: venueMatch ? venueMatch[2].trim() : null,
    title: 'Committee Meeting'
  };
};

const hasDatabaseConnection = () => Meeting && Meeting.connection && Meeting.connection.readyState === 1;

const buildAssistantSystemPrompt = (roleName = 'Citizen') => {
  const normalizedRole = normalizeRoleName(roleName);
  const allowedKnowledge = [...getRoleKnowledgeAccess(normalizedRole)];

  return `${ICAMS_ASSISTANT_PERSONA}

User access level: ${normalizedRole}
Allowed knowledge areas: ${allowedKnowledge.join(', ') || 'None'}

Rules:
- Use only the available Assembly records and authorized database data.
- If a record is unavailable, say: "I could not find this information in the available Assembly records."
- Never reveal information outside the user's role permissions.
- For answers based on official records, include the source record name and date where relevant.
- Keep answers clear, factual, and concise.`;
};

const executeAssistantAction = (question, user = null, options = {}) => {
  const action = detectAssistantAction(question);
  if (!action) return null;

  const roleName = normalizeRoleName(user?.role?.name || user?.role || 'Citizen');
  const allowedRoles = ACTION_PERMISSION_MAP[action.type] || [];
  if (!allowedRoles.includes(roleName)) {
    return {
      type: action.type,
      status: 'denied',
      answer: `I can’t perform that action for the ${roleName} role. Required access: ${allowedRoles.join(', ')}.`,
      executionPlan: action.executionPlan,
      permissions: allowedRoles
    };
  }

  if (options.confirmAction !== true) {
    return {
      type: action.type,
      status: 'confirmation_required',
      answer: `I’m ready to ${action.name.toLowerCase()} for you. Please confirm this action before I proceed.`,
      executionPlan: action.executionPlan,
      requiresConfirmation: true,
      permissions: allowedRoles
    };
  }

  if (!hasDatabaseConnection()) {
    return {
      type: action.type,
      status: 'completed',
      answer: `I validated the request and permissions for ${roleName}, but the ICAMS database is not connected in this environment. The action would still follow this plan: ${action.executionPlan.join(' → ')}.`,
      executionPlan: action.executionPlan,
      results: [],
      databaseUnavailable: true
    };
  }

  const runAction = async () => {
    try {
      if (action.type === 'schedule_meeting') {
        const details = parseMeetingSchedulingDetails(question);
        if (!details.date || !details.time || !details.venue) {
          return {
            type: action.type,
            status: 'clarification_needed',
            answer: 'I can help create the meeting. Please provide the date, time, and venue.',
            executionPlan: action.executionPlan,
            draft: details
          };
        }

        const scheduledAt = new Date(details.date);
        scheduledAt.setHours(10, 0, 0, 0);
        if (details.time) {
          const timeValue = details.time.toLowerCase();
          const hourMatch = timeValue.match(/(\d{1,2})/);
          if (hourMatch) {
            const hour = Number(hourMatch[1]);
            const isPm = /pm/.test(timeValue);
            const normalizedHour = isPm && hour < 12 ? hour + 12 : hour;
            scheduledAt.setHours(normalizedHour, 0, 0, 0);
          }
        }

        const createdMeeting = await Meeting.create({
          title: `${details.title} - ${details.day || formatDate(scheduledAt)}`,
          meetingType: 'committee',
          status: 'Scheduled',
          startTime: scheduledAt,
          room: details.venue,
          notes: `Created by AI assistant on ${new Date().toISOString()}`,
          agenda: `Committee discussion scheduled for ${formatDate(scheduledAt)} at ${details.time || '10:00 AM'}.`
        });

        return {
          type: action.type,
          status: 'completed',
          answer: `I scheduled the meeting for ${formatDate(createdMeeting.startTime)} at ${details.time || '10:00 AM'} in ${details.venue}.`,
          executionPlan: action.executionPlan,
          result: {
            id: createdMeeting._id,
            title: createdMeeting.title,
            time: createdMeeting.startTime,
            venue: createdMeeting.room
          }
        };
      }

      if (action.type === 'list_overdue_action_items') {
        const meetings = await Meeting.find({ 'actionItems.status': 'Overdue' }).lean();
        const overdueItems = meetings.flatMap((meeting) => (meeting.actionItems || []).filter((item) => item.status === 'Overdue').map((item) => ({
          meetingTitle: meeting.title,
          title: item.title,
          deadline: item.deadline,
          assignedTo: item.assignedTo || 'Unassigned',
          status: item.status
        })));

        return {
          type: action.type,
          status: 'completed',
          answer: overdueItems.length
            ? `I found ${overdueItems.length} overdue committee action item(s): ${overdueItems.map((item) => `${item.title} (${item.meetingTitle})`).join('; ')}.`
            : 'There are no overdue committee action items at the moment.',
          executionPlan: action.executionPlan,
          results: overdueItems
        };
      }

      if (action.type === 'generate_attendance_report') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const meetings = await Meeting.find({ startTime: { $gte: monthStart, $lte: monthEnd } })
          .populate('attendees committee')
          .lean();

        const attendeeTotals = meetings.reduce((accumulator, meeting) => {
          const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];
          attendees.forEach((member) => {
            const memberName = member?.name || member?.full_name || 'Unknown member';
            accumulator[memberName] = (accumulator[memberName] || 0) + 1;
          });
          return accumulator;
        }, {});

        const summary = Object.entries(attendeeTotals).map(([memberName, count]) => ({ memberName, attendanceCount: count }));

        return {
          type: action.type,
          status: 'completed',
          answer: summary.length
            ? `I generated the MCA attendance report for ${now.toLocaleString('en-KE', { month: 'long', year: 'numeric' })}. Top attendance: ${summary.slice(0, 5).map((entry) => `${entry.memberName} (${entry.attendanceCount})`).join(', ')}.`
            : `I did not find any attendance records for ${now.toLocaleString('en-KE', { month: 'long', year: 'numeric' })}.`,
          executionPlan: action.executionPlan,
          report: summary,
          period: {
            from: monthStart,
            to: monthEnd
          }
        };
      }

      return {
        type: action.type,
        status: 'unsupported',
        answer: 'That action is not yet supported by the assistant.',
        executionPlan: action.executionPlan
      };
    } catch (error) {
      return {
        type: action.type,
        status: 'completed',
        answer: 'I validated the request and permissions, but the ICAMS database is temporarily unavailable. Please retry when the system is connected.',
        executionPlan: action.executionPlan,
        results: [],
        error: error.message
      };
    }
  };

  return runAction();
};

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

const normalizePhrase = (value) => normalize(value).replace(/\s+/g, ' ').trim();

const formatDate = (value) => {
  if (!value) return 'Date not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not specified';
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
};

const recordRouteMap = {
  Bill: '/bills',
  Meeting: '/meetings',
  Committee: '/committees',
  Document: '/documents',
  default: '/dashboard'
};

const buildSourceCitation = (record = {}) => {
  const type = record.type || 'Document';
  const title = record.title || 'Assembly record';
  const sourceType = record.sourceType || record.metadata?.sourceType || 'Official record';
  const dateValue = record.relatedDate || record.date || record.createdAt || record.updatedAt;
  const dateText = dateValue ? formatDate(dateValue) : 'Date not specified';
  const page = record.metadata?.page || record.page || record.pageNumber || record.metadata?.pageNumber;
  const label = `${title} — ${dateText}${page ? `, page ${page}` : ''}${sourceType ? `, ${sourceType}` : ''}`;

  return {
    label,
    url: recordRouteMap[type] || recordRouteMap.default,
    type,
    sourceType,
    page
  };
};

const extractKeywords = (question) => {
  const words = normalize(question)
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return [...new Set(words)];
};

const scoreText = (text, keywords) => {
  const haystack = normalize(text);
  let score = 0;

  keywords.forEach((keyword) => {
    if (!keyword) return;
    if (haystack.includes(keyword)) score += 2;
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(haystack)) score += 3;
  });

  return score;
};

const summarizeText = (text, maxWords = 50) => {
  if (!text) return 'No detailed summary available.';
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);

  if (sentences.length === 0) {
    return cleaned.length > maxWords ? `${cleaned.slice(0, maxWords)}...` : cleaned;
  }

  const primary = sentences[0];
  const summary = primary.length > maxWords ? `${primary.slice(0, maxWords).trim()}...` : primary;
  return summary;
};

const extractEvidenceSnippet = (text, keywords = []) => {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return 'No matching text snippet available.';

  const normalizedKeywords = (keywords || []).map((keyword) => normalize(keyword)).filter(Boolean);
  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);

  if (sentences.length) {
    let bestSentence = sentences[0];
    let bestScore = -1;

    sentences.forEach((sentence) => {
      const normalized = normalize(sentence);
      let score = 0;
      normalizedKeywords.forEach((keyword) => {
        if (!keyword) return;
        if (normalized.includes(keyword)) score += 3;
        const regex = new RegExp(`\\b${keyword}\\b`);
        if (regex.test(normalized)) score += 2;
      });

      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence;
      }
    });

    return bestSentence.length > 220 ? `${bestSentence.slice(0, 220).trim()}...` : bestSentence;
  }

  return source.length > 220 ? `${source.slice(0, 220).trim()}...` : source;
};

const summarizeBill = (bill) => {
  const motions = bill.motions?.map((motion) => motion.text).filter(Boolean).slice(0, 2).join('; ') || 'No motions recorded.';
  const recommendations = bill.committeeRecommendations?.map((item) => item.recommendation).filter(Boolean).slice(0, 2).join('; ') || 'No committee recommendations recorded.';

  return [
    `${bill.title} is currently in ${bill.status || 'draft'} status.`,
    `Summary: ${bill.summary || 'No additional summary was provided.'}`,
    `Recent motions: ${motions}.`,
    `Committee feedback: ${recommendations}.`
  ].join(' ');
};

const summarizeMeeting = (meeting) => {
  const agenda = meeting.agenda || 'No agenda provided.';
  const minutes = meeting.minutes || 'No minutes recorded yet.';
  const outcome = meeting.outcome || 'No formal outcome recorded yet.';
  const actionItems = meeting.actionItems?.map((item) => item.title).filter(Boolean).slice(0, 2).join(', ') || 'No action items recorded.';

  return [
    `${meeting.title} is scheduled for ${meeting.startTime ? new Date(meeting.startTime).toLocaleString() : 'an unspecified time'}.`,
    `Agenda: ${summarizeText(agenda, 60)} `,
    `Minutes: ${summarizeText(minutes, 60)} `,
    `Outcome: ${summarizeText(outcome, 60)} `,
    `Action items: ${actionItems}.`
  ].join(' ');
};

const summarizeCommittee = (committee) => {
  const recommendations = committee.recommendations?.map((item) => item.text).filter(Boolean).slice(0, 2).join('; ') || 'No recommendations recorded.';
  return [
    `${committee.name} is a committee record with ${committee.members?.length || 0} members.`,
    `${committee.description || 'No description provided yet.'}`,
    `Key recommendations: ${recommendations}.`
  ].join(' ');
};

const summarizeDocument = (document) => {
  return [
    `${document.title} (${document.docNumber || 'No number'}) is classified as ${document.type || 'document'} and is currently ${document.status || 'draft'}.`,
    `${document.description || 'No description provided.'}`,
    `Tags: ${(document.tags || []).join(', ') || 'No tags assigned.'}`
  ].join(' ');
};

const buildSummary = (record, question) => {
  const questionLower = question.toLowerCase();

  if (record.type === 'Bill') return summarizeBill(record);
  if (record.type === 'Meeting') return summarizeMeeting(record);
  if (record.type === 'Committee') return summarizeCommittee(record);
  if (record.type === 'Document') return summarizeDocument(record);

  if (/summary|summarize|brief|overview/.test(questionLower)) {
    return summarizeText(record.summary || record.description || record.agenda || record.title || 'No summary available.', 80);
  }

  return summarizeText(record.summary || record.description || record.agenda || record.minutes || record.title || 'No summary available.', 80);
};

const detectDateRange = (questionText) => {
  const q = normalize(questionText);
  const now = new Date();

  const startOfDay = (date) => {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  };

  const endOfDay = (date) => {
    const value = new Date(date);
    value.setHours(23, 59, 59, 999);
    return value;
  };

  if (/today|todays/.test(q)) {
    return { start: startOfDay(now), end: endOfDay(now), label: 'today' };
  }

  if (/yesterday/.test(q)) {
    const day = new Date(now);
    day.setDate(day.getDate() - 1);
    return { start: startOfDay(day), end: endOfDay(day), label: 'yesterday' };
  }

  if (/last week/.test(q)) {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { start, end: now, label: 'last week' };
  }

  if (/last month|previous month/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { start, end, label: 'last month' };
  }

  if (/this month/.test(q)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: 'this month' };
  }

  if (/last year/.test(q)) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end, label: 'last year' };
  }

  return { start: null, end: null, label: 'all time' };
};

const inferKnowledgeCategory = (record) => {
  const text = `${record.title || ''} ${record.summary || ''} ${record.text || ''}`.toLowerCase();

  if (record.type === 'Meeting' || /meeting|minutes|agenda|session|sitting|attendance|action item/.test(text)) {
    return 'Meetings and Proceedings';
  }

  if (record.type === 'Committee' || /committee|chair|recommendation|report/.test(text)) {
    return 'Assembly Governance';
  }

  if (record.type === 'Bill' || /bill|motion|vote|voting|resolution|petition|question/.test(text)) {
    return 'Legislative Process';
  }

  if (/budget|finance|procurement|expenditure|contract|financial|award/.test(text)) {
    return 'Financial and Procurement';
  }

  if (/public|notice|feedback|response|submission|citizen|participation/.test(text)) {
    return 'Public Participation';
  }

  return 'Assembly Governance';
};

const getDateValue = (record) => {
  const candidates = [record.createdAt, record.updatedAt, record.startTime, record.endTime, record.date];
  for (const value of candidates) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

const recordInDateRange = (record, dateRange) => {
  if (!dateRange || !dateRange.start || !dateRange.end) return true;
  const date = getDateValue(record);
  if (!date) return true;
  return date >= dateRange.start && date <= dateRange.end;
};

const readTextFileIfPossible = (filePath) => {
  if (!filePath) return '';

  const normalized = String(filePath).replace(/\\/g, '/');
  const candidatePaths = [
    path.resolve(__dirname, '..', normalized),
    path.resolve(process.cwd(), normalized),
    path.resolve(process.cwd(), 'uploads', path.basename(normalized)),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate);
        if (!stat.isFile()) continue;

        const ext = path.extname(candidate).toLowerCase();
        if (['.txt', '.md', '.csv', '.json', '.log'].includes(ext)) {
          const content = fs.readFileSync(candidate, 'utf8');
          if (content && content.trim()) return String(content).replace(/\s+/g, ' ').trim();
        }
      }
    } catch (error) {
      // Ignore unreadable files and continue to the next candidate.
    }
  }

  return '';
};

const extractTextFromDocument = (document = {}, filePathHint = '') => {
  const fields = [
    document.title,
    document.description,
    document.docNumber,
    document.type,
    document.document_type,
    document.category,
    document.origin,
    document.destination,
    document.currentDepartment,
    document.responseNotes,
    document.sender?.name,
    document.sender?.organization,
    document.recipient?.name,
    document.recipient?.organization,
    Array.isArray(document.tags) ? document.tags.join(' ') : '',
    Array.isArray(document.files) ? document.files.map((file) => [file.originalName, file.filename, file.mimeType, file.path].filter(Boolean).join(' ')).join(' ') : '',
    Array.isArray(document.approvalHistory) ? document.approvalHistory.map((entry) => entry.comment).join(' ') : '',
    Array.isArray(document.movementHistory) ? document.movementHistory.map((entry) => entry.reason).join(' ') : '',
    filePathHint,
    readTextFileIfPossible(filePathHint)
  ].filter(Boolean);

  return fields.join(' ');
};

const extractTextFromHansard = (entry = {}) => {
  const parts = [
    entry.title,
    entry.notes,
    entry.sessionType,
    entry.sessionDate,
    entry.sitting?.title,
    entry.sitting?.room,
    Array.isArray(entry.entries) ? entry.entries.map((item) => [
      item.speakerName,
      item.role,
      item.text,
      item.member?.name,
      item.member?.full_name
    ].filter(Boolean).join(' ')).join(' ') : ''
  ].filter(Boolean);

  return parts.join(' ');
};

const parseIntent = (question) => {
  const q = normalize(question);

  let entity = 'general';
  if (/(bill|bills|motion|motions|vote|votes|resolution|resolutions)/.test(q)) entity = 'bill';
  else if (/(meeting|meetings|minutes|agenda|session|sitting|attendance|action)/.test(q)) entity = 'meeting';
  else if (/(committee|committees|chair|recommendation|recommendations|report|reports)/.test(q)) entity = 'committee';
  else if (/(document|documents|memo|memos|notice|notices|paper|papers|hansard|file|files)/.test(q)) entity = 'document';
  else if (/(budget|finance|procurement|expenditure|contract|financial)/.test(q)) entity = 'financial';
  else if (/(public|participation|feedback|submission|response|citizen)/.test(q)) entity = 'public';

  return {
    entity,
    dateRange: detectDateRange(question),
    keywords: extractKeywords(question)
  };
};

const matchCommitteeFromText = (question, knownCommittees = []) => {
  const q = normalizePhrase(question);

  if (!q) return null;

  const aliases = {
    education: 'Education, Youth Affairs Gender and Social Services',
    agriculture: 'Agriculture, Livestock and Fisheries',
    finance: 'Finance, Trade, Industry, Labour and Cooperative Development',
    budget: 'Budget and Appropriations',
    health: 'Health Services',
    public: 'Public Works, Roads, Transport and Communication',
    water: 'Water, Environment and Natural Resources',
    lands: 'Lands, Physical Planning, Surveying and Housing',
    tourism: 'Tourism, Wildlife Conservation and Information',
    roads: 'Public Works, Roads, Transport and Communication'
  };

  const committeeNames = [
    ...knownCommittees.map((committee) => committee.name || ''),
    ...Object.keys(aliases).map((key) => aliases[key])
  ].filter(Boolean);

  for (const name of committeeNames) {
    const normalizedName = normalizePhrase(name);
    if (!normalizedName) continue;
    if (q.includes(normalizedName) || normalizedName.includes(q) || q.includes(normalizedName.split(',')[0])) {
      return name;
    }
  }

  for (const [alias, name] of Object.entries(aliases)) {
    if (q.includes(alias) && !q.includes('committee on')) {
      return name;
    }
  }

  return null;
};

const parseNaturalLanguageRequest = (question, knownCommittees = []) => {
  const q = normalizePhrase(question);
  const committeeName = matchCommitteeFromText(q, knownCommittees);
  const lower = q.toLowerCase();

  const plan = {
    rawQuestion: question,
    entity: 'general',
    committeeName,
    meetingType: null,
    action: 'list',
    dateRange: detectDateRange(question),
    statusFilters: [],
    countOnly: false,
    keywords: extractKeywords(question),
    conditions: []
  };

  if (/(when is the next|next .*meeting|upcoming .*meeting|when.*meeting)/.test(lower)) {
    plan.action = 'next';
    plan.conditions.push({ type: 'time', operator: 'next', value: 'upcoming' });
  } else if (/(last .*meeting|latest .*meeting|most recent .*meeting|previous .*meeting|recent .*meeting)/.test(lower)) {
    plan.action = 'last';
    plan.conditions.push({ type: 'time', operator: 'latest', value: 'most recent' });
  } else if (/(how many|count|number of)/.test(lower) && /(meeting|meetings)/.test(lower)) {
    plan.action = 'count';
    plan.countOnly = true;
    plan.conditions.push({ type: 'aggregation', operator: 'count', value: 'meetings' });
  } else if (/(summarize|summary|latest report|most recent report|report)/.test(lower)) {
    plan.action = 'summary';
    plan.conditions.push({ type: 'content', operator: 'summarize', value: 'report' });
  } else if (/(which .*attended|who attended|attendance|attended the last|attended)/.test(lower)) {
    plan.action = 'attendance';
    plan.conditions.push({ type: 'attendance', operator: 'list', value: 'participants' });
  } else if (/(show me|list|currently under consideration|under consideration|currently under review)/.test(lower)) {
    plan.action = 'list';
    plan.conditions.push({ type: 'listing', operator: 'show', value: 'records' });
  }

  if (/(who is attending|who attended|which .*attended|attendance|attendees)/.test(lower)) {
    plan.conditions.push({ type: 'attendance', operator: 'list', value: 'participants' });
  }

  if (/(plenary|session|sitting)/.test(lower)) {
    plan.meetingType = 'session';
    plan.conditions.push({ type: 'meetingType', operator: 'equals', value: 'session' });
  } else if (/(committee meeting|committee.*meeting|committee.*report)/.test(lower)) {
    plan.meetingType = 'committee';
    plan.conditions.push({ type: 'meetingType', operator: 'equals', value: 'committee' });
  }

  if (/(bill|bills|under consideration|consideration|review)/.test(lower)) {
    plan.entity = 'bill';
    plan.statusFilters = ['Submitted', 'Committee Review', 'Debate', 'Voting'];
    plan.conditions.push({ type: 'status', operator: 'in', value: plan.statusFilters });
  } else if (/(meeting|meetings|attended|attendance|next .*meeting|plenary)/.test(lower)) {
    plan.entity = 'meeting';
    plan.conditions.push({ type: 'entity', operator: 'equals', value: 'meeting' });
  } else if (/(report|summary|latest .*report|committee report|report on)/.test(lower)) {
    plan.entity = 'document';
    plan.conditions.push({ type: 'entity', operator: 'equals', value: 'document' });
  } else if (/(mca|members|attendee|attended)/.test(lower)) {
    plan.entity = 'meeting';
    plan.conditions.push({ type: 'attendance', operator: 'requires', value: 'attendee list' });
  }

  if (plan.committeeName && plan.entity === 'meeting' && !plan.meetingType) {
    plan.meetingType = 'committee';
    plan.conditions.push({ type: 'meetingType', operator: 'equals', value: 'committee' });
  }

  if (committeeName) {
    plan.conditions.push({ type: 'committee', operator: 'equals', value: committeeName });
  }

  return plan;
};

const isDatabaseReady = () => mongoose.connection && mongoose.connection.readyState === 1;

const executeNaturalLanguageQuery = async (question) => {
  if (!isDatabaseReady()) {
    return {
      answer: 'I could not access the Assembly records because the database connection is currently unavailable. Please check the MongoDB configuration and try again.',
      intent: 'system',
      category: 'Database unavailable',
      results: [],
      queryPlan: parseNaturalLanguageRequest(question),
      sourceCitations: []
    };
  }

  const knownCommittees = await Committee.find({}).lean();
  const plan = parseNaturalLanguageRequest(question, knownCommittees);

  if (plan.entity === 'bill') {
    const matchFilter = { status: { $in: plan.statusFilters.length ? plan.statusFilters : ['Submitted', 'Committee Review', 'Debate', 'Voting'] } };

    if (plan.committeeName) {
      const relatedCommittee = knownCommittees.find((committee) => committee.name.toLowerCase().includes(plan.committeeName.toLowerCase()) || plan.committeeName.toLowerCase().includes(committee.name.toLowerCase()));
      if (relatedCommittee) matchFilter.committee = relatedCommittee._id;
    }

    const bills = await Bill.find(matchFilter).populate('committee proposer').sort({ updatedAt: -1 }).limit(5).lean();
    const results = bills.map((bill) => ({
      type: 'Bill',
      title: bill.title,
      status: bill.status,
      summary: bill.summary || 'No summary available.',
      category: 'Legislative Process',
      sourceType: 'Official legislative record',
      relatedDate: bill.updatedAt || bill.createdAt,
      metadata: {
        committee: bill.committee?.name || 'Unassigned',
        proposer: bill.proposer?.name || 'Unknown',
        status: bill.status
      }
    }));

    const answer = results.length
      ? `I found ${results.length} bill(s) currently under consideration${plan.committeeName ? ` for ${plan.committeeName}` : ''}. ${results.slice(0, 3).map((bill) => `${bill.title} (${bill.status})`).join('; ')}.`
      : `I did not find any bills under consideration${plan.committeeName ? ` for ${plan.committeeName}` : ''}.`;

    return {
      answer,
      intent: 'bill',
      category: 'Legislative Process',
      results: results.map((record) => ({
        ...record,
        citation: buildSourceCitation(record)
      })),
      queryPlan: plan,
      sourceCitations: results.map((record) => buildSourceCitation(record))
    };
  }

  if (plan.entity === 'meeting') {
    const matchFilter = {};
    if (plan.committeeName) {
      const relatedCommittee = knownCommittees.find((committee) => committee.name.toLowerCase().includes(plan.committeeName.toLowerCase()) || plan.committeeName.toLowerCase().includes(committee.name.toLowerCase()));
      if (relatedCommittee) matchFilter.committee = relatedCommittee._id;
    }

    if (plan.meetingType === 'session' || /plenary|session/.test(plan.rawQuestion?.toLowerCase() || '')) {
      matchFilter.$or = [{ sittingType: 'Plenary' }, { meetingType: 'session' }];
    } else if (plan.meetingType === 'committee' || plan.committeeName) {
      matchFilter.meetingType = 'committee';
    }

    const dateRange = detectDateRange(question);
    if (dateRange.start && dateRange.end && !/(next|upcoming|last|latest|most recent|recent)/.test(plan.rawQuestion.toLowerCase())) {
      matchFilter.startTime = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const meetings = await Meeting.find(matchFilter)
      .populate('committee attendees attendance.user')
      .sort({ startTime: plan.action === 'next' || plan.action === 'list' ? 1 : -1 })
      .limit(plan.action === 'attendance' ? 1 : 5)
      .lean();

    if (plan.action === 'attendance') {
      const selectedMeeting = meetings[0];
      const attendees = (selectedMeeting?.attendees || []).map((user) => user?.name || user?.full_name || 'Unknown attendee');
      const answer = selectedMeeting
        ? `The last relevant plenary/meeting included ${attendees.length} attendee(s): ${attendees.join(', ')}.`
        : 'I could not find attendee data for that meeting.';

      return {
        answer,
        intent: 'meeting',
        category: 'Meetings and Proceedings',
        results: selectedMeeting ? [{
          type: 'Meeting',
          title: selectedMeeting.title,
          status: selectedMeeting.status,
          summary: selectedMeeting.agenda || selectedMeeting.notes || 'No summary available.',
          category: 'Meetings and Proceedings',
          sourceType: 'Meeting record',
          relatedDate: selectedMeeting.startTime || selectedMeeting.createdAt,
          metadata: {
            committee: selectedMeeting.committee?.name || 'General',
            meetingType: selectedMeeting.meetingType || selectedMeeting.sittingType || 'Committee',
            attendees: attendees.join(', ')
          },
          snippet: extractEvidenceSnippet(`${selectedMeeting.title} ${selectedMeeting.agenda || ''} ${selectedMeeting.notes || ''} ${attendees.join(' ')}`, plan.keywords),
          citation: buildSourceCitation({
            type: 'Meeting',
            title: selectedMeeting.title,
            relatedDate: selectedMeeting.startTime || selectedMeeting.createdAt,
            sourceType: 'Meeting record'
          })
        }] : [],
        queryPlan: plan,
        sourceCitations: selectedMeeting ? [buildSourceCitation({
          type: 'Meeting',
          title: selectedMeeting.title,
          relatedDate: selectedMeeting.startTime || selectedMeeting.createdAt,
          sourceType: 'Meeting record'
        })] : []
      };
    }

    if (plan.action === 'count') {
      const count = await Meeting.countDocuments(matchFilter);
      const answer = `${count} meeting(s) were found${plan.committeeName ? ` for ${plan.committeeName}` : ''}${plan.dateRange.label && plan.dateRange.label !== 'all time' ? ` in the ${plan.dateRange.label} period` : ''}.`;
      return { answer, intent: 'meeting', category: 'Meetings and Proceedings', results: [], queryPlan: plan };
    }

    if (plan.action === 'next') {
      const nextMeeting = meetings.find((meeting) => new Date(meeting.startTime) >= new Date()) || meetings[0];
      const answer = nextMeeting
        ? `The next ${plan.committeeName ? `${plan.committeeName} ` : ''}meeting is ${nextMeeting.title} on ${formatDate(nextMeeting.startTime)}.`
        : 'I could not find an upcoming meeting for that request.';

      return {
        answer,
        intent: 'meeting',
        category: 'Meetings and Proceedings',
        results: nextMeeting ? [{
          type: 'Meeting',
          title: nextMeeting.title,
          status: nextMeeting.status,
          summary: nextMeeting.agenda || nextMeeting.notes || 'No agenda available.',
          category: 'Meetings and Proceedings',
          sourceType: 'Meeting record',
          relatedDate: nextMeeting.startTime || nextMeeting.createdAt,
          metadata: {
            committee: nextMeeting.committee?.name || 'General',
            room: nextMeeting.room || 'TBD',
            meetingType: nextMeeting.meetingType || nextMeeting.sittingType || 'Committee'
          },
          snippet: extractEvidenceSnippet(`${nextMeeting.title} ${nextMeeting.agenda || ''} ${nextMeeting.notes || ''}`, plan.keywords),
          citation: buildSourceCitation({
            type: 'Meeting',
            title: nextMeeting.title,
            relatedDate: nextMeeting.startTime || nextMeeting.createdAt,
            sourceType: 'Meeting record'
          })
        }] : [],
        queryPlan: plan,
        sourceCitations: nextMeeting ? [buildSourceCitation({
          type: 'Meeting',
          title: nextMeeting.title,
          relatedDate: nextMeeting.startTime || nextMeeting.createdAt,
          sourceType: 'Meeting record'
        })] : []
      };
    }

    const results = meetings.map((meeting) => ({
      type: 'Meeting',
      title: meeting.title,
      status: meeting.status,
      summary: meeting.agenda || meeting.notes || 'No summary available.',
      category: 'Meetings and Proceedings',
      sourceType: 'Meeting record',
      relatedDate: meeting.startTime || meeting.createdAt,
      metadata: {
        committee: meeting.committee?.name || 'General',
        room: meeting.room || 'TBD',
        meetingType: meeting.meetingType || meeting.sittingType || 'Committee',
        attendees: (meeting.attendees || []).length
      }
    }));

    const answer = results.length
      ? `I found ${results.length} meeting(s)${plan.committeeName ? ` for ${plan.committeeName}` : ''}. ${results.slice(0, 3).map((meeting) => `${meeting.title} (${formatDate(meeting.relatedDate)})`).join('; ')}.`
      : `I could not find any meetings${plan.committeeName ? ` for ${plan.committeeName}` : ''}.`;

    return { answer, intent: 'meeting', category: 'Meetings and Proceedings', results: results.map((meeting) => ({
      ...meeting,
      snippet: extractEvidenceSnippet(`${meeting.title} ${meeting.summary || ''} ${meeting.metadata?.committee || ''}`, plan.keywords),
      citation: buildSourceCitation({
        type: 'Meeting',
        title: meeting.title,
        relatedDate: meeting.relatedDate,
        sourceType: meeting.sourceType,
        metadata: meeting.metadata
      })
    })), queryPlan: plan, sourceCitations: results.map((meeting) => buildSourceCitation({
      type: 'Meeting',
      title: meeting.title,
      relatedDate: meeting.relatedDate,
      sourceType: meeting.sourceType,
      metadata: meeting.metadata
    })) };
  }

  if (plan.entity === 'document') {
    const matchFilter = { document_type: { $in: ['Committee Reports', 'Minutes', 'Hansard', 'Notices', 'Other'] } };

    if (plan.committeeName) {
      const committeeTerms = plan.committeeName.toLowerCase();
      matchFilter.$or = [
        { title: { $regex: committeeTerms, $options: 'i' } },
        { description: { $regex: committeeTerms, $options: 'i' } },
        { tags: { $in: [new RegExp(committeeTerms, 'i')] } }
      ];
    }

    const docs = await Document.find(matchFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const results = docs.map((document) => ({
      type: 'Document',
      title: document.title,
      status: document.status,
      summary: document.description || 'No summary available.',
      category: 'Assembly Governance',
      sourceType: 'Document archive',
      relatedDate: document.createdAt || document.updatedAt,
      metadata: {
        docNumber: document.docNumber,
        type: document.document_type || document.type,
        tags: (document.tags || []).join(', ')
      }
    }));

    const answer = results.length
      ? `I found ${results.length} relevant report(s)${plan.committeeName ? ` for ${plan.committeeName}` : ''}. ${results.slice(0, 3).map((doc) => `${doc.title} (${doc.status})`).join('; ')}.`
      : `I could not find any committee reports${plan.committeeName ? ` for ${plan.committeeName}` : ''}.`;

    return {
      answer,
      intent: 'document',
      category: 'Assembly Governance',
      results: results.map((document) => ({
        ...document,
        snippet: extractEvidenceSnippet(`${document.title} ${document.summary || ''} ${document.metadata?.docNumber || ''}`, plan.keywords),
        citation: buildSourceCitation({
          type: 'Document',
          title: document.title,
          relatedDate: document.relatedDate,
          sourceType: document.sourceType,
          metadata: document.metadata
        })
      })),
      queryPlan: plan,
      sourceCitations: results.map((document) => buildSourceCitation({
        type: 'Document',
        title: document.title,
        relatedDate: document.relatedDate,
        sourceType: document.sourceType,
        metadata: document.metadata
      }))
    };
  }

  return null;
};

const buildKnowledgeIndex = async () => {
  const [bills, meetings, committees, documents, hansards] = await Promise.all([
    Bill.find({}).populate('proposer committee motions.proposer committeeRecommendations.committee committeeRecommendations.recommendedBy').lean(),
    Meeting.find({}).populate('committee attendees department orderPaper hansard documents').lean(),
    Committee.find({}).populate('chairperson viceChairperson members reports recommendations.by').lean(),
    Document.find({}).populate('owner uploaded_by assignedTo department approvalHistory.by').lean(),
    Hansard.find({}).populate('sitting entries.speaker entries.member').lean()
  ]);

  const entries = [];

  bills.forEach((bill) => {
    const text = [
      bill.title,
      bill.summary,
      bill.status,
      bill.committee?.name,
      ...(bill.motions || []).map((motion) => motion.text),
      ...(bill.committeeRecommendations || []).map((item) => item.recommendation)
    ].filter(Boolean).join(' ');

    entries.push({
      type: 'Bill',
      title: bill.title,
      summary: bill.summary || 'No summary provided.',
      status: bill.status || 'Draft',
      category: inferKnowledgeCategory({ type: 'Bill', title: bill.title, summary: bill.summary, text }),
      sourceType: 'Official legislative record',
      relatedDate: getDateValue(bill) || bill.createdAt,
      text,
      metadata: {
        committee: bill.committee?.name || 'Unassigned',
        proposer: bill.proposer?.name || 'Unknown',
        updatedAt: bill.updatedAt || bill.createdAt
      },
      record: bill
    });
  });

  meetings.forEach((meeting) => {
    const text = [
      meeting.title,
      meeting.agenda,
      meeting.notes,
      meeting.minutes,
      meeting.outcome,
      ...(meeting.actionItems || []).map((item) => `${item.title} ${item.notes || ''}`),
      meeting.committee?.name,
      meeting.room
    ].filter(Boolean).join(' ');

    entries.push({
      type: 'Meeting',
      title: meeting.title,
      summary: meeting.agenda || meeting.notes || meeting.outcome || 'No summary provided.',
      status: meeting.status || 'Scheduled',
      category: inferKnowledgeCategory({ type: 'Meeting', title: meeting.title, summary: meeting.agenda || meeting.notes || meeting.outcome, text }),
      sourceType: 'Meeting record',
      relatedDate: getDateValue(meeting) || meeting.startTime || meeting.createdAt,
      text,
      metadata: {
        committee: meeting.committee?.name || 'Unassigned',
        room: meeting.room || 'TBD',
        startTime: meeting.startTime
      },
      record: meeting
    });
  });

  committees.forEach((committee) => {
    const text = [
      committee.name,
      committee.description,
      ...(committee.recommendations || []).map((item) => item.text),
      ...(committee.members || []).map((member) => member?.name)
    ].filter(Boolean).join(' ');

    entries.push({
      type: 'Committee',
      title: committee.name,
      summary: committee.description || 'No description provided.',
      status: 'Active',
      category: inferKnowledgeCategory({ type: 'Committee', title: committee.name, summary: committee.description, text }),
      sourceType: 'Committee governance record',
      relatedDate: getDateValue(committee) || committee.createdAt,
      text,
      metadata: {
        members: committee.members?.length || 0,
        chairperson: committee.chairperson?.name || 'Unassigned'
      },
      record: committee
    });
  });

  documents.forEach((document) => {
    const fileText = Array.isArray(document.files) && document.files.length > 0
      ? document.files.map((file) => readTextFileIfPossible(file.path)).filter(Boolean).join(' ')
      : '';

    const text = [
      extractTextFromDocument(document, Array.isArray(document.files) && document.files.length > 0 ? document.files[0].path : ''),
      fileText,
      document.title,
      document.description,
      document.docNumber,
      document.type,
      document.document_type,
      ...(document.tags || []),
      ...(document.approvalHistory || []).map((entry) => entry.comment)
    ].filter(Boolean).join(' ');

    entries.push({
      type: 'Document',
      title: document.title,
      summary: document.description || 'No description provided.',
      status: document.status || 'Draft',
      category: inferKnowledgeCategory({ type: 'Document', title: document.title, summary: document.description, text }),
      sourceType: 'Document archive',
      relatedDate: getDateValue(document) || document.createdAt,
      text,
      metadata: {
        docNumber: document.docNumber,
        type: document.type,
        tags: (document.tags || []).join(', '),
        files: Array.isArray(document.files) ? document.files.map((file) => file.originalName || file.filename).join(', ') : 'No attachment'
      },
      record: document
    });
  });

  hansards.forEach((hansard) => {
    const text = extractTextFromHansard(hansard);

    entries.push({
      type: 'Document',
      title: hansard.title,
      summary: hansard.notes || 'Hansard transcript summary not provided.',
      status: hansard.status || 'Published',
      category: 'Meetings and Proceedings',
      sourceType: 'Hansard transcript',
      relatedDate: getDateValue(hansard) || hansard.sessionDate || hansard.createdAt,
      text,
      metadata: {
        sessionType: hansard.sessionType,
        sessionDate: hansard.sessionDate,
        entries: Array.isArray(hansard.entries) ? hansard.entries.length : 0,
        sitting: hansard.sitting?.title || 'Unassigned'
      },
      record: hansard
    });
  });

  return entries;
};

const retrieveEvidence = async (question) => {
  const intent = parseIntent(question);
  const entries = await buildKnowledgeIndex();

  const scored = entries
    .map((entry) => {
      const matchesIntent =
        intent.entity === 'general' ||
        (intent.entity === 'bill' && entry.type === 'Bill') ||
        (intent.entity === 'meeting' && entry.type === 'Meeting') ||
        (intent.entity === 'committee' && entry.type === 'Committee') ||
        (intent.entity === 'document' && entry.type === 'Document') ||
        (intent.entity === 'financial' && (/budget|finance|procurement|expenditure|contract|financial/.test(`${entry.title} ${entry.summary} ${entry.text}`.toLowerCase()))) ||
        (intent.entity === 'public' && (/public|participation|feedback|submission|response|citizen/.test(`${entry.title} ${entry.summary} ${entry.text}`.toLowerCase())));

      const keywordScore = scoreText(`${entry.title} ${entry.summary} ${entry.text}`, intent.keywords);
      const dateBoost = recordInDateRange(entry, intent.dateRange) ? 10 : -50;
      const typeBoost = matchesIntent ? 15 : 0;
      const categoryBoost = KNOWLEDGE_CATEGORIES.some((category) => category.keywords.some((keyword) => intent.keywords.includes(keyword))) ? 8 : 0;
      const score = keywordScore + typeBoost + categoryBoost + dateBoost + (entry.title ? 2 : 0);

      return {
        ...entry,
        score,
        matchesIntent,
        dateRangeLabel: intent.dateRange.label
      };
    })
    .filter((entry) => entry.matchesIntent || entry.score > 0 || intent.keywords.length === 0)
    .filter((entry) => recordInDateRange(entry, intent.dateRange))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    intent,
    results: scored,
    totalMatches: scored.length
  };
};

const buildAnswer = (question, evidence) => {
  const { intent, results } = evidence;

  if (!results || !results.length) {
    return {
      answer: 'I could not find any matching Assembly records for that question. Please try a different date range, document type, or subject such as bills, meetings, committees, budgets, or public participation.',
      intent: intent.entity,
      category: 'No matching records',
      results: []
    };
  }

  const intro = intent.dateRange.label && intent.dateRange.label !== 'all time'
    ? `During the requested ${intent.dateRange.label} period, I found ${results.length} relevant record(s):`
    : `I found ${results.length} relevant record(s):`;

  const body = results.map((record, index) => {
    const dateText = record.relatedDate ? ` (${formatDate(record.relatedDate)})` : '';
    const statusText = record.status ? ` — ${record.status}` : '';
    return `${index + 1}. ${record.title}${dateText}${statusText}`;
  }).join('\n');

  const sourceList = results
    .map((record) => `${record.type} — ${record.title} (${record.sourceType})`)
    .join('; ');

  const citedResults = results.map((record) => ({
    type: record.type,
    title: record.title,
    status: record.status,
    summary: record.summary,
    category: record.category,
    sourceType: record.sourceType,
    relatedDate: record.relatedDate,
    metadata: record.metadata,
    snippet: extractEvidenceSnippet(`${record.title || ''} ${record.summary || ''} ${record.text || ''}`, extractKeywords(question)),
    citation: buildSourceCitation({
      type: record.type,
      title: record.title,
      relatedDate: record.relatedDate,
      sourceType: record.sourceType,
      metadata: record.metadata
    })
  }));

  return {
    answer: `${intro}\n\n${body}\n\nSources: ${sourceList}.`,
    intent: intent.entity,
    category: results[0].category || 'Assembly records',
    results: citedResults,
    sourceCitations: citedResults.map((item) => item.citation)
  };
};

router.get('/knowledge-base', verifyToken, async (req, res) => {
  res.json({
    knowledgeBase: getKnowledgeBaseTree(),
    categories: KNOWLEDGE_CATEGORIES,
    sourceTypes: [
      'Official legislative records',
      'Meeting records',
      'Committee governance records',
      'Document archive',
      'Public participation records'
    ],
    examples: [
      'Summarize the latest meeting and action items.',
      'What is the status of the latest bill under review?',
      'Find committee reports related to procurement or finance.',
      'Explain the legislative process for a motion.',
      'Search public participation records for citizen feedback.'
    ]
  });
});

router.get('/examples', verifyToken, async (req, res) => {
  res.json([
    'What bills are currently under committee review?',
    'Summarize the latest meetings and action items.',
    'Find documents related to budget and finance.',
    'Show committees and their recent recommendations.',
    'Give me a brief summary of the most recent motion activity.'
  ]);
});

router.post('/speech/transcribe', verifyToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please attach an audio recording to transcribe.' });
    }

    if (OPENAI_API_KEY) {
      const transcript = await transcribeWithOpenAI(req.file.buffer, req.file.mimetype || 'audio/webm');
      return res.json({ text: transcript || 'No speech detected.' });
    }

    return res.status(501).json({
      message: 'Server-backed speech transcription is not configured. Set OPENAI_API_KEY to enable it.'
    });
  } catch (error) {
    console.error('Speech transcription failed:', error);
    return res.status(500).json({ message: 'Speech transcription failed.', error: error.message });
  }
});

router.post('/speech/synthesize', verifyToken, async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Please provide text to synthesize.' });
    }

    let audioBuffer;
    if (OPENAI_API_KEY) {
      audioBuffer = await synthesizeWithOpenAI(text);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    }

    if (AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
      audioBuffer = await synthesizeWithAzure(text);
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    }

    return res.status(501).json({
      message: 'Server-backed speech synthesis is not configured. Set OPENAI_API_KEY or AZURE_SPEECH_KEY/AZURE_SPEECH_REGION.'
    });
  } catch (error) {
    console.error('Speech synthesis failed:', error);
    return res.status(500).json({ message: 'Speech synthesis failed.', error: error.message });
  }
});

router.post('/query', verifyToken, async (req, res) => {
  const question = String(req.body?.question || '').trim();

  if (!question) {
    return res.status(400).json({ message: 'Please provide a question to ask the assistant.' });
  }

  try {
    const userRole = normalizeRoleName(req.user?.role?.name || req.user?.role || 'Citizen');
    const allowedKnowledge = getRoleKnowledgeAccess(userRole);
    const confirmAction = Boolean(req.body?.confirmAction === true);
    const systemPrompt = buildAssistantSystemPrompt(userRole);

    if (!isDatabaseReady()) {
      return res.json({
        answer: 'I could not access the Assembly records because the database connection is currently unavailable. Please check the MongoDB configuration and try again.',
        intent: 'system',
        category: 'Database unavailable',
        results: [],
        evidence: [],
        queryPlan: parseNaturalLanguageRequest(question),
        allowedKnowledge: [...allowedKnowledge],
        accessDenied: false,
        sourceSnippets: [],
        systemPrompt
      });
    }

    const actionResult = await executeAssistantAction(question, req.user, { confirmAction });
    if (actionResult) {
      const actionResponse = {
        answer: actionResult.answer,
        intent: actionResult.type,
        category: 'Action result',
        results: actionResult.results || [],
        evidence: actionResult.results || [],
        action: actionResult,
        accessDenied: actionResult.status === 'denied',
        queryPlan: { action: actionResult.type, executionPlan: actionResult.executionPlan || [] },
        allowedKnowledge: [...allowedKnowledge],
        sourceSnippets: (actionResult.results || []).map((item) => ({
          type: item.meetingTitle ? 'Action item' : (item.memberName ? 'Attendance report' : 'Action'),
          title: item.title || item.memberName || 'Action result',
          snippet: item.title || item.memberName || 'Action result'
        }))
      };

      return res.json(actionResponse);
    }

    const naturalLanguageResult = await executeNaturalLanguageQuery(question);
    let evidence = await retrieveEvidence(question);
    let answer = buildAnswer(question, evidence);

    const plan = naturalLanguageResult?.queryPlan || parseNaturalLanguageRequest(question);

    if (naturalLanguageResult && naturalLanguageResult.results && naturalLanguageResult.results.length) {
      evidence = { ...evidence, results: naturalLanguageResult.results };
      answer = {
        answer: naturalLanguageResult.answer,
        intent: naturalLanguageResult.intent,
        category: naturalLanguageResult.category,
        results: naturalLanguageResult.results
      };
    }

    const rawResults = answer.results || evidence.results || [];
    const accessibleResults = filterEvidenceByRole(rawResults, userRole);

    if (rawResults.length > 0 && accessibleResults.length === 0) {
      return res.status(403).json({
        answer: `Your access level (${userRole}) does not permit this assistant to answer with those records.`,
        intent: answer.intent || 'restricted',
        category: 'Access denied',
        results: [],
        evidence: [],
        queryPlan: plan,
        allowedKnowledge: [...allowedKnowledge],
        accessDenied: true,
        sourceSnippets: []
      });
    }

    const filteredAnswer = {
      ...answer,
      results: accessibleResults,
      category: accessibleResults[0]?.category || answer.category,
      sourceSnippets: accessibleResults.map((item) => ({
        type: item.type,
        title: item.title,
        snippet: item.snippet || 'No source snippet available.'
      }))
    };

    return res.json({
      answer: filteredAnswer.answer,
      intent: filteredAnswer.intent,
      category: filteredAnswer.category,
      results: filteredAnswer.results,
      evidence: accessibleResults,
      queryPlan: plan,
      allowedKnowledge: [...allowedKnowledge],
      accessDenied: false,
      sourceSnippets: filteredAnswer.sourceSnippets,
      systemPrompt
    });
  } catch (error) {
    console.error('Assistant query failed:', error);
    return res.status(500).json({ message: 'Unable to answer the question right now.', error: error.message });
  }
});

module.exports = router;
module.exports.ICAMS_ASSISTANT_PERSONA = ICAMS_ASSISTANT_PERSONA;
module.exports.buildAssistantSystemPrompt = buildAssistantSystemPrompt;
module.exports.parseIntent = parseIntent;
module.exports.parseNaturalLanguageRequest = parseNaturalLanguageRequest;
module.exports.executeNaturalLanguageQuery = executeNaturalLanguageQuery;
module.exports.retrieveEvidence = retrieveEvidence;
module.exports.buildAnswer = buildAnswer;
module.exports.buildKnowledgeIndex = buildKnowledgeIndex;
module.exports.extractTextFromDocument = extractTextFromDocument;
module.exports.extractTextFromHansard = extractTextFromHansard;
module.exports.extractEvidenceSnippet = extractEvidenceSnippet;
module.exports.buildSourceCitation = buildSourceCitation;
module.exports.detectAssistantAction = detectAssistantAction;
module.exports.executeAssistantAction = executeAssistantAction;
module.exports.filterEvidenceByRole = filterEvidenceByRole;
module.exports.getRoleKnowledgeAccess = getRoleKnowledgeAccess;
module.exports.normalizeRoleName = normalizeRoleName;
module.exports.getKnowledgeBaseTree = getKnowledgeBaseTree;
module.exports.KNOWLEDGE_BASE_TREE = KNOWLEDGE_BASE_TREE;
module.exports.KNOWLEDGE_CATEGORIES = KNOWLEDGE_CATEGORIES;
