'use client';
import { statusColor } from '../lib/status';
import type { Status } from '../lib/types';


export default function StatusBadge({ value }: { value: Status }) {
return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(value)}`}>{value}</span>;
}