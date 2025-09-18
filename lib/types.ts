export type Status = 'Saved'|'Applied'|'OA'|'Screen'|'Tech'|'Onsite'|'Offer'|'Accepted'|'Rejected';


export type ApplicationDoc = {
    id?: string;
    title: string;
    company: string;
    location?: string;
    jobUrl?: string;
    status: Status;
    priority?: 'High'|'Medium'|'Low';
    jobType?: 'FT'|'Intern'|'Contract'|'Co-op';
    remote?: 'Remote'|'Hybrid'|'Onsite';
    techStack?: string[];
    createdAt?: any; // Firestore Timestamp
    appliedAt?: any;
    lastActionAt?: any;
    nextActionAt?: any;
    deadlineAt?: any;
    notes?: string;
    tags?: string[];
    statusOrder?: number;
    statusUpdatedAt?: any;  // NEW: last time status changed
    rejectionReason?: string; // for pie chart

};

export type StatusEvent = {
  id?: string;
  appId: string;
  type: 'status-change';
  from?: Status;
  to: Status;
  at: any; // timestamp
};