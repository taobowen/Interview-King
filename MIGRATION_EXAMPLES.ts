// Migration Guide: Firestore to PostgreSQL Query Examples

/*
===========================================
BEFORE: Firestore Queries
===========================================
*/

// OLD: Get user applications
/*
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const q = query(
  collection(db, `users/${uid}/applications`),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);
const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
*/

// OLD: Create application
/*
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

await addDoc(collection(db, `users/${uid}/applications`), {
  title: 'Software Engineer',
  company: 'Google',
  status: 'Applied',
  createdAt: serverTimestamp()
});
*/

// OLD: Update application
/*
import { updateDoc, doc } from 'firebase/firestore';

await updateDoc(doc(db, `users/${uid}/applications/${appId}`), {
  status: 'Rejected',
  lastActionAt: serverTimestamp()
});
*/

// OLD: Listen to real-time changes
/*
import { onSnapshot, query, collection } from 'firebase/firestore';

const unsubscribe = onSnapshot(
  query(collection(db, `users/${uid}/applications`)),
  (snapshot) => {
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setApplications(apps);
  }
);
*/

/*
===========================================
AFTER: PostgreSQL with API Routes
===========================================
*/

// NEW: Get user applications
/*
import { apiClient } from '@/lib/api-client';

const response = await apiClient.get('/api/applications');
const { applications } = await response.json();
*/

// NEW: Create application
/*
import { apiClient } from '@/lib/api-client';

const newApp = {
  title: 'Software Engineer',
  company: 'Google',
  status: 'Applied'
};

const response = await apiClient.post('/api/applications', newApp);
const { application } = await response.json();
*/

// NEW: Update application
/*
import { apiClient } from '@/lib/api-client';

const updates = {
  status: 'Rejected'
};

const response = await apiClient.patch(`/api/applications?id=${appId}`, updates);
const { application } = await response.json();
*/

// NEW: Real-time updates (using polling or WebSocket)
/*
import { apiClient } from '@/lib/api-client';
import { useEffect, useState } from 'react';

function useApplications() {
  const [applications, setApplications] = useState([]);
  
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await apiClient.get('/api/applications');
        const { applications: apps } = await response.json();
        setApplications(apps);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      }
    };
    
    fetchApplications();
    
    // Poll for updates every 30 seconds (or use WebSocket)
    const interval = setInterval(fetchApplications, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return applications;
}
*/

/*
===========================================
SERVER-SIDE: API Route Patterns
===========================================
*/

// Pattern 1: Using withAuth middleware
/*
import { withAuth, type AuthenticatedRequest } from '@/lib/auth-middleware';
import { db } from '@/lib/db';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  const { user } = req; // user.id is the PostgreSQL user ID
  
  const result = await db.query(
    'SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id]
  );
  
  return NextResponse.json({ applications: result.rows });
});
*/

// Pattern 2: Manual authentication
/*
import { authenticate } from '@/lib/auth-middleware';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticate(req);
    const body = await req.json();
    
    const result = await db.query(
      'INSERT INTO applications (user_id, title_text, company) VALUES ($1, $2, $3) RETURNING *',
      [user.id, body.title, body.company]
    );
    
    return NextResponse.json({ application: result.rows[0] });
  } catch (error) {
    if (error.message.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
*/

/*
===========================================
KEY SECURITY PRINCIPLE
===========================================
*/

// ❌ NEVER trust user_id from client
/*
const badQuery = `
  SELECT * FROM applications 
  WHERE user_id = '${req.body.userId}' // DANGEROUS!
`;
*/

// ✅ ALWAYS derive user_id from verified token
/*
const { user } = await authenticate(req); // Verify token first
const goodQuery = `
  SELECT * FROM applications 
  WHERE user_id = $1 // Use verified user.id
`;
await db.query(goodQuery, [user.id]);
*/

export {}; // Make this a module