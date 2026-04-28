export const fallbackDashboard = {
  brand: {
    name: 'ERB Command Center',
    eyebrow: 'Executive Readiness Board',
    headline: 'A sharp operating view for leadership, execution, and cash visibility.',
    description:
      'ERB brings together delivery priorities, sales momentum, and credit exposure in one polished command surface built for daily decision-making.',
    primaryAction: 'Review board priorities',
    secondaryAction: 'Open operating summary'
  },
  summary: [
    {
      id: 'readiness',
      label: 'Launch readiness',
      value: '92%',
      delta: '+8% this week',
      tone: 'accent'
    },
    {
      id: 'streams',
      label: 'Active workstreams',
      value: '06',
      delta: '03 critical',
      tone: 'calm'
    },
    {
      id: 'decision',
      label: 'Decision cycle',
      value: '18h',
      delta: '-5h faster',
      tone: 'accent'
    },
    {
      id: 'stakeholders',
      label: 'Key stakeholders',
      value: '14',
      delta: 'Updated today',
      tone: 'calm'
    }
  ],
  capabilities: [
    {
      title: 'Unified executive view',
      description:
        'Track execution, revenue health, and leadership priorities without switching between disconnected tools.'
    },
    {
      title: 'Live risk radar',
      description:
        'Surface blockers, delayed approvals, and overdue accounts before they impact the operating plan.'
    },
    {
      title: 'Scalable governance model',
      description:
        'Use a structure that can grow with products, branches, regions, or business units.'
    }
  ],
  alerts: [
    {
      title: 'Vendor approval pending',
      description: 'Legal sign-off is still required before the partner launch can move to final release.',
      level: 'high'
    },
    {
      title: 'Sales forecast refresh',
      description: 'The weekly sales forecast is four hours old and should be refreshed before review.',
      level: 'medium'
    }
  ],
  board: [
    {
      id: 'ERB-101',
      title: 'Launch the strategic partner portal',
      owner: 'Product Team',
      priority: 'High',
      progress: 78,
      status: 'on_track',
      deadline: '2026-04-16T09:00:00.000Z',
      summary: 'The new visual system is approved, and legal clearance is the final blocker.'
    },
    {
      id: 'ERB-114',
      title: 'Standardize the internal approval journey',
      owner: 'Operations Team',
      priority: 'Medium',
      progress: 61,
      status: 'attention',
      deadline: '2026-04-21T12:30:00.000Z',
      summary: 'The workflow model is ready and escalation rules are now under validation.'
    },
    {
      id: 'ERB-127',
      title: 'Enable executive reporting workspace',
      owner: 'Business Intelligence',
      priority: 'High',
      progress: 89,
      status: 'approved',
      deadline: '2026-04-11T08:00:00.000Z',
      summary: 'Reporting content is almost complete and only the final KPI review remains.'
    }
  ],
  timeline: [
    {
      phase: 'Phase 01',
      title: 'Define board scope',
      window: '08 Apr - 11 Apr',
      detail: 'Align decision makers, confirm success metrics, and lock the delivery streams.'
    },
    {
      phase: 'Phase 02',
      title: 'Build the command view',
      window: '12 Apr - 18 Apr',
      detail: 'Shape the experience, finalize the key data surfaces, and tune the alert model.'
    },
    {
      phase: 'Phase 03',
      title: 'Readiness review',
      window: '19 Apr - 24 Apr',
      detail: 'Review performance, sign off on the final operating view, and prepare launch.'
    }
  ],
  activity: [
    {
      title: 'Partner portal status was updated',
      meta: '12 minutes ago'
    },
    {
      title: 'Governance team added a new executive note',
      meta: '29 minutes ago'
    },
    {
      title: 'Quality reporting delay alert was resolved',
      meta: '1 hour ago'
    }
  ],
  sales: {
    overview: [
      {
        id: 'revenue',
        label: 'Monthly revenue',
        value: '$124K',
        delta: '+12.4%',
        tone: 'accent'
      },
      {
        id: 'orders',
        label: 'Closed orders',
        value: '38',
        delta: '+6 this week',
        tone: 'calm'
      },
      {
        id: 'avg-order',
        label: 'Average order',
        value: '$3.2K',
        delta: 'Stable',
        tone: 'neutral'
      }
    ],
    orders: [
      {
        id: 'SO-2048',
        client: 'Northwind Retail',
        amount: '$18,200',
        owner: 'Mia Clark',
        status: 'paid',
        dueDate: '2026-04-10T08:00:00.000Z'
      },
      {
        id: 'SO-2051',
        client: 'Atlas Distribution',
        amount: '$9,750',
        owner: 'Liam Reed',
        status: 'pending',
        dueDate: '2026-04-13T08:00:00.000Z'
      },
      {
        id: 'SO-2054',
        client: 'BluePeak Stores',
        amount: '$14,300',
        owner: 'Noah Miles',
        status: 'processing',
        dueDate: '2026-04-15T08:00:00.000Z'
      }
    ],
    pipeline: [
      {
        stage: 'Qualified',
        count: 12,
        value: '$42K'
      },
      {
        stage: 'Proposal',
        count: 7,
        value: '$31K'
      },
      {
        stage: 'Negotiation',
        count: 4,
        value: '$19K'
      }
    ]
  },
  credit: {
    overview: [
      {
        id: 'outstanding',
        label: 'Outstanding balance',
        value: '$48K',
        delta: '7 open accounts',
        tone: 'warning'
      },
      {
        id: 'overdue',
        label: 'Overdue invoices',
        value: '11',
        delta: '$14K at risk',
        tone: 'alert'
      },
      {
        id: 'collection',
        label: 'Collection rate',
        value: '87%',
        delta: '+3% this month',
        tone: 'calm'
      }
    ],
    receivables: [
      {
        account: 'Atlas Distribution',
        invoice: 'INV-1842',
        amount: '$9,400',
        age: '12 days',
        status: 'current'
      },
      {
        account: 'BluePeak Stores',
        invoice: 'INV-1851',
        amount: '$4,850',
        age: '24 days',
        status: 'due_soon'
      },
      {
        account: 'Summit Traders',
        invoice: 'INV-1860',
        amount: '$6,300',
        age: '39 days',
        status: 'overdue'
      }
    ],
    collectionTimeline: [
      {
        window: 'Today',
        amount: '$6,800',
        note: '2 invoices scheduled for collection'
      },
      {
        window: 'Next 7 days',
        amount: '$15,200',
        note: '5 accounts require follow-up'
      },
      {
        window: 'Next 30 days',
        amount: '$26,000',
        note: 'Large balance review in progress'
      }
    ]
  }
};

const statusMap = {
  planned: 'on_track',
  in_progress: 'attention',
  done: 'approved'
};

export function mapTasksToBoardItems(tasks) {
  return tasks.map((task, index) => ({
    id: `ERB-${100 + Number(task.id)}`,
    title: task.title,
    owner: index % 2 === 0 ? 'Product Team' : 'Operations Team',
    priority: task.status === 'done' ? 'Low' : task.status === 'in_progress' ? 'Medium' : 'High',
    progress: task.status === 'done' ? 100 : task.status === 'in_progress' ? 68 : 42,
    status: statusMap[task.status] ?? 'on_track',
    deadline: task.created_at,
    summary: task.description
  }));
}
