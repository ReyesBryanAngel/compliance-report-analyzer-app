import type { Workflow, UploadedFile, Report } from './types'

export const WORKFLOWS: Workflow[] = [
  {
    id: 'affordability',
    name: 'Affordability & Financial Health',
    description: 'Assess customer affordability and financial risk',
    iconType: 'shield',
    colorScheme: 'purple',
  },
  {
    id: 'gambling',
    name: 'Gambling Exposure',
    description: 'Detect and quantify gambling-related activity',
    iconType: 'dice',
    colorScheme: 'amber',
  },
  {
    id: 'aml',
    name: 'Transaction Risk & AML',
    description: 'Flag suspicious transactions and AML risk',
    iconType: 'alert',
    colorScheme: 'red',
  },
  {
    id: 'document-integrity',
    name: 'Document Integrity',
    description: 'Verify document authenticity and detect tampering',
    iconType: 'scan',
    colorScheme: 'teal',
  },
]

export const INITIAL_FILES: UploadedFile[] = [
  {
    id: '1',
    batchName: 'Batch-Jan-2025-001',
    fileName: 'customer_transactions_Q4.csv',
    status: 'Completed',
    uploadedAt: '2025-01-15 09:23',
  },
  {
    id: '2',
    batchName: 'Batch-Dec-2024-001',
    fileName: 'gambling_activity_dec.xlsx',
    status: 'Completed',
    uploadedAt: '2025-01-10 14:45',
  },
  {
    id: '3',
    batchName: 'Batch-Q4-2024-001',
    fileName: 'aml_flagged_accounts.csv',
    status: 'Completed',
    uploadedAt: '2025-01-05 11:30',
  },
  {
    id: '4',
    batchName: 'Batch-Jan-2025-001',
    fileName: 'income_verification_jan.pdf',
    status: 'Completed',
    uploadedAt: '2025-01-16 10:05',
  },
  {
    id: '5',
    batchName: 'Batch-Dec-2024-002',
    fileName: 'gambling_transactions_dec.csv',
    status: 'Processing',
    uploadedAt: '2025-01-12 16:20',
  },
  {
    id: '6',
    batchName: 'Batch-Q4-2024-001',
    fileName: 'suspicious_transfers_q4.xlsx',
    status: 'Completed',
    uploadedAt: '2025-01-06 09:00',
  },
  {
    id: '7',
    batchName: 'Batch-Q4-2024-002',
    fileName: 'high_risk_accounts_q4.csv',
    status: 'Failed',
    uploadedAt: '2025-01-07 15:45',
  },
]

export const INITIAL_REPORTS: Report[] = [
  {
    id: '1',
    name: 'Affordability Report - Jan 2025',
    workflowId: 'affordability',
    generatedAt: '2025-01-16',
    status: 'Ready',
  },
  {
    id: '2',
    name: 'Gambling Exposure Report - Jan 2025',
    workflowId: 'gambling',
    generatedAt: '2025-01-11',
    status: 'Ready',
  },
  {
    id: '3',
    name: 'AML Risk Report - Q4 2024',
    workflowId: 'aml',
    generatedAt: '2025-01-06',
    status: 'Ready',
  },
  {
    id: '4',
    name: 'AML Risk Report - Q3 2024',
    workflowId: 'aml',
    generatedAt: '2024-10-01',
    status: 'Ready',
  },
]
