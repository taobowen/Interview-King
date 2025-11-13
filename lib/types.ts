export type Status = 'Saved'|'Applied'|'OA'|'Screen'|'Tech'|'Onsite'|'Offer'|'Accepted'|'Rejected';


export type ApplicationDoc = {
    id?: string;
    title: string;
    company: string;
    location?: string;
    jobUrl?: string;
    status: Status;
    priority?: 'High'|'Medium'|'Low';
    positionLevel?: 'NG'|'Junior'|'Mid'|'Senior'|'Staff';
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
    refusedAt?: Status; // the stage at which the app was rejected (prev status when setting Rejected)

};

export type StatusEvent = {
  id?: string;
  appId: string;
  type: 'status-change';
  from?: Status;
  to: Status;
  at: any; // timestamp
};