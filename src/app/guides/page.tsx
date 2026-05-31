'use client'

import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableRow {
  cells: string[]
}

interface Section {
  title: string
  content: string
  table?: { headers: string[]; rows: TableRow[] }
  note?: string
}

interface Checkpoint {
  id: number
  slug: string
  title: string
  subtitle: string
  sections: Section[]
}

interface Workflow {
  id: string
  label: string
  color: string
  activeColor: string
  borderColor: string
  badgeColor: string
  checkpoints: Checkpoint[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const workflows: Workflow[] = [
  {
    id: 'affordability',
    label: 'Affordability & Financial Health',
    color: 'text-indigo-700',
    activeColor: 'bg-indigo-600',
    borderColor: 'border-indigo-200',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    checkpoints: [
      {
        id: 1,
        slug: 'recurring-salary',
        title: 'recurring-salary',
        subtitle: 'Know Your Customer — Salary Verification',
        sections: [
          {
            title: 'Purpose',
            content:
              'Verify that the subject has a legitimate, stable, and recurring salary income. The absence of a detectable salary is a high-risk signal — it indicates an unexplained income source.',
          },
          {
            title: 'How It Works — 5-Signal Confidence Model',
            content:
              'All inflow transactions are first filtered to identify salary candidates — any transaction whose category is salary, or whose description matches keywords: salary, payroll, sweldo, wages, stipend, GSIS, SSS benefit, etc.\n\nIf no salary candidates are found at all, the checkpoint immediately returns triggered, high, score 90. Otherwise, five signals are evaluated and summed into a confidence score (0–100):',
            table: {
              headers: ['Signal', 'Weight', 'Logic'],
              rows: [
                { cells: ['Keyword match', '30 pts', 'At least one transaction matched the salary keyword list'] },
                { cells: ['Monthly day-of-month pattern', '25 pts', 'Salary lands on a consistent day (std dev of days ≤ 5). Dates 28–31 are normalized to 28'] },
                { cells: ['Stable amount', '20 pts', 'Coefficient of variation of peak monthly salary credit ≤ 10%'] },
                { cells: ['Consistent sender', '15 pts', 'A single word (≥4 chars) from the description appears in ≥70% of months — proxy for the same employer'] },
                { cells: ['Bank channel', '10 pts', '≥50% of salary transactions arrived via bank or transfer channel, not ewallet or ATM'] },
              ],
            },
          },
          {
            title: 'Decision Table',
            content: '',
            table: {
              headers: ['Confidence', 'Triggered', 'Severity', 'Reason'],
              rows: [
                { cells: ['≥ 70%', 'No', 'Low', 'Salary confirmed'] },
                { cells: ['40–69%', 'Yes', 'Medium', 'Weak/irregular salary signal'] },
                { cells: ['< 40%', 'Yes', 'High', 'No meaningful salary pattern detected'] },
                { cells: ['No candidates', 'Yes', 'High', 'No salary-related inflows detected at all'] },
              ],
            },
          },
        ],
      },
      {
        id: 2,
        slug: 'income-consistency',
        title: 'income-consistency',
        subtitle: 'Know Your Customer — Income Stability',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect unstable or erratic income patterns. Highly volatile monthly inflows suggest unreliable or irregular income sources, which is a concern for credit and onboarding assessments.',
          },
          {
            title: 'How It Works',
            content:
              'All inflows are grouped by calendar month and totaled. Two metrics are derived:\n\nCoefficient of Variation (CV) = stddev(monthly totals) / mean. A CV of 0.50 means the monthly income swings ±50% around its average.\n\nLinear trend — a regression slope across monthly totals, normalized by the mean. Slope > +0.05 = growing; slope < -0.05 = declining; otherwise stable.\n\nA declining trend adds one severity level as a penalty on top of the CV-based rating. If fewer than 2 months of data exist, the checkpoint is skipped.',
          },
          {
            title: 'Decision Table',
            content: '',
            table: {
              headers: ['CV Range', 'Base Severity', 'With Declining Penalty', 'Score'],
              rows: [
                { cells: ['> 50%', 'Medium', 'High', '75 / 85'] },
                { cells: ['25–50%', 'Low', 'Medium', '40 / 55'] },
                { cells: ['≤ 25%', 'Not triggered', 'Low (score 20)', '10 / 20'] },
              ],
            },
          },
        ],
      },
      {
        id: 3,
        slug: 'loan-stacking',
        title: 'loan-stacking',
        subtitle: 'Know Your Customer — Concurrent Borrowing',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect when a person takes out multiple loans in a very short period — a sign of financial distress, predatory borrowing, or deliberate credit abuse.',
          },
          {
            title: 'How It Works',
            content:
              'Inflow transactions are filtered to identify loan disbursements — transactions whose category is loan_payment or whose description matches: loan, lending, mortgage, disbursement, credit facility, or specific Philippine fintech lenders (Tala, Cashalo, Tonik, Home Credit, Pag-IBIG Loan, SSS Loan, GSIS Loan, etc.).\n\nA peak 30-day window algorithm then finds the rolling window containing the highest number of loan disbursements. This focuses on concurrent borrowing rather than normal monthly repayments spread over time.',
          },
          {
            title: 'Decision Table (Default Thresholds)',
            content: '',
            table: {
              headers: ['Peak Count (30-day window)', 'Triggered', 'Severity'],
              rows: [
                { cells: ['≤ 1 (greenMax)', 'No', 'Low'] },
                { cells: ['≤ 2 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 2', 'Yes', 'High'] },
              ],
            },
          },
        ],
      },
      {
        id: 4,
        slug: 'low-balance-persistence',
        title: 'low-balance-persistence',
        subtitle: 'Know Your Customer — Cash Flow Strain',
        sections: [
          {
            title: 'Purpose',
            content:
              'Identify chronic cash flow strain — when an account consistently ends a month with a dangerously low balance relative to its income level.',
          },
          {
            title: 'How It Works',
            content:
              'Only transactions that include a balance field are considered. A dynamic threshold is computed: 20% of the average monthly inflow total. For example, if average monthly income is ₱50,000, the threshold is ₱10,000.\n\nAll transactions are sorted chronologically and the last transaction per calendar month (end-of-month snapshot) is extracted. Any month where that final balance falls below the threshold is flagged as a "low balance month."',
          },
          {
            title: 'Decision Table (Default Thresholds)',
            content: '',
            table: {
              headers: ['Low-balance Months', 'Triggered', 'Severity'],
              rows: [
                { cells: ['≤ 1 (greenMax)', 'No', 'Low'] },
                { cells: ['≤ 3 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 3', 'Yes', 'High'] },
              ],
            },
            note: 'If no balance data is present in the transaction set, the checkpoint is skipped and returns not triggered, low, score 0.',
          },
        ],
      },
    ],
  },
  {
    id: 'traml',
    label: 'Transaction AML',
    color: 'text-rose-700',
    activeColor: 'bg-rose-600',
    borderColor: 'border-rose-200',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    checkpoints: [
      {
        id: 5,
        slug: 'rapid-inflow-outflow',
        title: 'rapid-inflow-outflow',
        subtitle: 'Pass-through / Conduit Detection',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect "pass-through" money laundering — money is received and then almost entirely moved out within a short window, suggesting the account is being used as a conduit rather than a genuine spending account.',
          },
          {
            title: 'How It Works',
            content:
              'For every significant inflow (≥ minInflow, default ₱5,000), all outflows within the next windowHours (default 72 hours) are summed. If total outflows ≥ 80% of the inflow amount (drainRatio), the pair counts as one cycle — a complete pass-through event.\n\nEvidence across all cycles is deduplicated (a transaction flagged by multiple inflows is only shown once).',
          },
          {
            title: 'Default Parameters',
            content: '',
            table: {
              headers: ['Parameter', 'Default', 'Meaning'],
              rows: [
                { cells: ['windowHours', '72 h', 'How long after the inflow to watch for matching outflows'] },
                { cells: ['drainRatio', '0.80', 'Fraction of inflow that must exit to count as a cycle'] },
                { cells: ['minInflow', '₱5,000', 'Minimum inflow size; filters trivial everyday transactions'] },
                { cells: ['greenMax', '0', 'Any cycle triggers the checkpoint'] },
                { cells: ['amberMax', '1', '1 cycle = medium; more than 1 = high'] },
              ],
            },
          },
        ],
      },
      {
        id: 6,
        slug: 'rapid-movement-of-funds',
        title: 'rapid-movement-of-funds',
        subtitle: 'High-velocity Transaction Bursts',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect high-velocity transaction bursts — periods where an unusually large total value moves through the account in a short time window, regardless of direction.',
          },
          {
            title: 'How It Works',
            content:
              'All transactions are sorted by date. For each transaction used as an anchor, a forward-looking window of windowHours (default 24 hours) is computed. If the total amount of all transactions in that window ≥ velocityThreshold (default ₱50,000), the window is flagged.\n\nOverlapping windows are merged — once a window is flagged, the next anchor must start after that window closes.',
          },
          {
            title: 'Decision Table (Default Thresholds)',
            content: '',
            table: {
              headers: ['Flagged Windows', 'Triggered', 'Severity'],
              rows: [
                { cells: ['0 (greenMax)', 'No', 'Low'] },
                { cells: ['1–2 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 2', 'Yes', 'High'] },
              ],
            },
          },
        ],
      },
      {
        id: 7,
        slug: 'circular-transaction',
        title: 'circular-transaction',
        subtitle: 'Round-trip / Layering Detection',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect round-trip transactions — money sent out and returned in a nearly identical amount shortly after. This is a classic money laundering layering technique used to obscure the origin of funds.',
          },
          {
            title: 'How It Works',
            content:
              'Each outflow (≥ minAmount, default ₱5,000) is paired with a subsequent inflow that meets two conditions:\n\n• Occurs within windowHours (default 72 hours) after the outflow\n• Amount is within ± amountTolerance (default 5%) of the outflow amount\n\nEach inflow can only be matched once (matched indices are tracked) to prevent double-counting.',
          },
          {
            title: 'Decision Table (Default Thresholds)',
            content: '',
            table: {
              headers: ['Round-trip Matches', 'Triggered', 'Severity'],
              rows: [
                { cells: ['0 (greenMax)', 'No', 'Low'] },
                { cells: ['1 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 1', 'Yes', 'High'] },
              ],
            },
          },
        ],
      },
      {
        id: 8,
        slug: 'fragmented-transactions',
        title: 'fragmented-transactions',
        subtitle: 'Structuring / Smurfing Detection',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect structuring (also called "smurfing") — deliberately splitting a large payment into multiple smaller amounts just below a regulatory reporting threshold to evade detection.',
          },
          {
            title: 'How It Works',
            content:
              'Only outflows strictly below singleTxnCeiling (default ₱499,000 — just under the ₱500,000 CTR threshold) are considered. Transactions are grouped by beneficiaryId — the same recipient receiving many sub-threshold payments within a short window is the key signal.\n\nFor each beneficiary group, a rolling window of windowDays (default 3 days) is applied. A window is flagged as a structuring cluster if it contains ≥ minFragments (default 3) transactions that collectively total ≥ aggregateFloor (default ₱500,000).',
          },
          {
            title: 'Default Parameters',
            content: '',
            table: {
              headers: ['Parameter', 'Default', 'Meaning'],
              rows: [
                { cells: ['windowDays', '3', 'Rolling window for aggregating fragments'] },
                { cells: ['singleTxnCeiling', '₱499,000', 'Max per-transaction amount to be considered a fragment'] },
                { cells: ['aggregateFloor', '₱500,000', 'Minimum combined total to flag a cluster'] },
                { cells: ['minFragments', '3', 'Minimum number of transactions to constitute structuring'] },
              ],
            },
          },
        ],
      },
      {
        id: 9,
        slug: 'ctr-threshold',
        title: 'ctr-threshold',
        subtitle: 'Currency Transaction Report Obligations',
        sections: [
          {
            title: 'Purpose',
            content:
              'Flag transactions that trigger Currency Transaction Report (CTR) obligations under AMLC rules (Philippine AML law). A CTR is required for single transactions ≥ ₱500,000, or when multiple sub-threshold transactions on the same day aggregate to ₱500,000+.',
          },
          {
            title: 'How It Works — Two-Phase Detection',
            content:
              'Phase 1 — Single transaction breach: Any individual transaction with amount ≥ singleTxLimit (default ₱500,000) is directly counted as one breach event.\n\nPhase 2 — Daily aggregate breach: The remaining sub-threshold transactions are grouped by calendar day. Any day where the combined total reaches dailyAggregateLimit (default ₱500,000) is counted as an additional breach event.',
          },
          {
            title: 'Decision Table (Default Thresholds)',
            content: '',
            table: {
              headers: ['Total Breach Events', 'Triggered', 'Severity'],
              rows: [
                { cells: ['0 (greenMax)', 'No', 'Low'] },
                { cells: ['1–2 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 2', 'Yes', 'High'] },
              ],
            },
          },
        ],
      },
      {
        id: 10,
        slug: 'cross-border-transfer',
        title: 'cross-border-transfer',
        subtitle: 'High-risk Jurisdiction Transfers',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect transactions involving high-risk foreign jurisdictions and suspicious foreign currency rotation — key AML red flags for international money laundering and fund layering.',
          },
          {
            title: 'How It Works — Three-Phase Detection',
            content:
              'Phase 1 — FATF Blacklist (immediate escalation): If any transaction (≥ minAmount, default ₱10,000) is linked to a FATF-blacklisted country, the checkpoint immediately returns triggered, high, score 100.\n\nPhase 2 — Elevated-risk jurisdictions: Transactions linked to FATF greylist countries, known offshore havens, or EU tax blacklist territories are each counted as one flagged event.\n\nPhase 3 — Currency mixing signal: Foreign-currency transactions (non-PHP, ≥ minAmount) are checked in a rolling window of currencyMixWindowDays (default 30 days). If ≥ currencyMixMinDistinct (default 3) distinct foreign currencies appear in one window, it is flagged as a currency-mixing event.',
          },
          {
            title: 'Decision Table (Phase 2 + 3 Combined)',
            content: '',
            table: {
              headers: ['Flagged Events', 'Triggered', 'Severity'],
              rows: [
                { cells: ['≤ 2 (greenMax)', 'No', 'Low'] },
                { cells: ['3–5 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 5', 'Yes', 'High'] },
              ],
            },
          },
        ],
      },
      {
        id: 11,
        slug: 'geographic-risk-scoring',
        title: 'geographic-risk-scoring',
        subtitle: 'Weighted Geographic Exposure',
        sections: [
          {
            title: 'Purpose',
            content:
              'Provide a nuanced, weighted geographic risk score — not just a count of risky jurisdictions, but a measure of how much of the total transaction value flows through them. A small number of large transactions to a risky country is more dangerous than many trivial ones.',
          },
          {
            title: 'How It Works — Three Phases',
            content:
              'Phase 1 — FATF Blacklist: Same immediate escalation as cross-border — any qualifying transaction linked to a blacklisted country returns triggered, high, score 100.\n\nPhase 2 — Weighted exposure ratio: For each transaction linked to an elevated-risk jurisdiction, its amount is multiplied by a tier weight:',
            table: {
              headers: ['Tier', 'Weight'],
              rows: [
                { cells: ['FATF Greylist', '0.6'] },
                { cells: ['Offshore Haven', '0.4'] },
                { cells: ['EU Tax Blacklist', '0.3'] },
              ],
            },
          },
          {
            title: '',
            content:
              'The exposure ratio = sum(amount × weight) / total transaction value.\n\nPhase 3 — Dual signal severity: Severity is the worst of two independent signals: (1) the exposure ratio vs. exposureGreenRatio/exposureAmberRatio, and (2) the count of distinct elevated-risk jurisdictions vs. greenMax/amberMax. Either signal alone can push severity to high.',
          },
        ],
      },
      {
        id: 12,
        slug: 'sanctions-watchlist',
        title: 'sanctions-watchlist',
        subtitle: 'Sanctioned Entity Screening',
        sections: [
          {
            title: 'Purpose',
            content:
              'Screen every transaction against a curated list of sanctioned individuals and entities from OFAC SDN, UN Consolidated, EU Sanctions, and AMLC lists. Any match requires immediate mandatory reporting.',
          },
          {
            title: 'How It Works',
            content:
              'For each transaction, three text fields are extracted and screened: description, beneficiaryId (name prefix only — name: entries), and reference.\n\nMatching uses a token-based approach: both the entity name and the transaction text are normalized (lowercased, punctuation stripped) and tokenized (words ≥ 3 chars). A match is declared if every token of the sanctioned entity\'s name appears in the transaction text\'s token set — order-independent and extra-words tolerant.',
            note: 'Any match immediately returns triggered, high, score 100. Mandatory reporting and asset freeze review are required. If no matches are found, the result is not triggered, low, score 0.',
          },
        ],
      },
    ],
  },
  {
    id: 'gambling',
    label: 'Gambling Exposure',
    color: 'text-amber-700',
    activeColor: 'bg-amber-600',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    checkpoints: [
      {
        id: 13,
        slug: 'gambling-debits',
        title: 'gambling-debits',
        subtitle: 'Gambling Outflow Count',
        sections: [
          {
            title: 'Shared Utility — gambling-utils.ts',
            content:
              'All four checkpoints share isGamblingTx(), which identifies gambling transactions by checking category === \'gambling\' or matching keywords: casino, bet, gambling, lotto, poker, slots, bingo, PAGCOR, e-games, sabong, cockpit, jai-alai, horse racing, Philippine Amusement, etc. They also share the applyThreshold() function, which applies the green/amber/red band logic to any count.',
          },
          {
            title: 'Purpose',
            content:
              'Count the total number of gambling outflow transactions — the raw volume of gambling spending events. A high count indicates frequent gambling expenditure.',
          },
          {
            title: 'How It Works',
            content:
              'Filters all transactions to those where direction === \'outflow\' and isGamblingTx() returns true. The total count is passed to applyThreshold() against the configured ThresholdBand.',
          },
        ],
      },
      {
        id: 14,
        slug: 'gambling-days',
        title: 'gambling-days',
        subtitle: 'Frequency of Gambling Activity',
        sections: [
          {
            title: 'Purpose',
            content:
              'Count the number of distinct calendar days on which any gambling transaction occurred. This measures behavioral frequency rather than transaction volume — a daily gambler with small bets would score high here even with a low total count.',
          },
          {
            title: 'How It Works',
            content:
              'All gambling transactions (any direction) are identified via isGamblingTx(). Their dates are truncated to YYYY-MM-DD and added to a Set. The Set\'s size is the unique day count, passed to applyThreshold().',
          },
        ],
      },
      {
        id: 15,
        slug: 'gambling-activity',
        title: 'gambling-activity',
        subtitle: 'Total Gambling Transaction Count',
        sections: [
          {
            title: 'Purpose',
            content:
              'Count all gambling transactions regardless of direction — both spending and winnings. This is the broadest signal, capturing active participation on gambling platforms including platform payouts (inflows).',
          },
          {
            title: 'How It Works',
            content:
              'All transactions passing isGamblingTx() (both inflows and outflows) are collected. The total count is passed to applyThreshold().',
          },
        ],
      },
      {
        id: 16,
        slug: 'gambling-overdrafts',
        title: 'gambling-overdrafts',
        subtitle: 'Gambling-induced Overdrafts',
        sections: [
          {
            title: 'Purpose',
            content:
              'Identify gambling outflows that resulted in a negative account balance — the subject gambled beyond their available funds. This is the most severe gambling signal, indicating compulsive behavior and extreme financial risk.',
          },
          {
            title: 'How It Works',
            content:
              'Filters for transactions where: direction === \'outflow\', isGamblingTx() is true, balance field is present, and balance < 0. The count of such overdrafts is passed to applyThreshold().',
            note: 'Requires balance data to be present in the transaction set. If no balances are recorded, no overdrafts can be detected and the metric will return 0 (not triggered).',
          },
        ],
      },
    ],
  },
  {
    id: 'document-integrity',
    label: 'Document Integrity',
    color: 'text-teal-700',
    activeColor: 'bg-teal-600',
    borderColor: 'border-teal-200',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    checkpoints: [
      {
        id: 17,
        slug: 'statement-balance-discrepancy',
        title: 'statement-balance-discrepancy',
        subtitle: 'Balance Arithmetic Verification',
        sections: [
          {
            title: 'Purpose',
            content:
              'Verify that each transaction\'s reported running balance is mathematically consistent with the previous balance plus or minus the transaction amount. Discrepancies are a direct indicator of altered or fabricated statements.',
          },
          {
            title: 'How It Works',
            content:
              'All transactions containing a balance field are sorted chronologically. Starting from the first transaction\'s balance as the seed, each subsequent transaction is checked:\n\n• If inflow: expectedBalance += amount\n• If outflow: expectedBalance -= amount\n\nThe computed expected balance is compared to the reported balance. If the difference exceeds ₱1.00 (the rounding tolerance), the transaction is flagged as discrepant. After a discrepancy, the expected balance is recalibrated to the reported balance so each discrepancy is counted independently.',
          },
          {
            title: 'Decision Table (Default Thresholds)',
            content: '',
            table: {
              headers: ['Discrepancies', 'Triggered', 'Severity'],
              rows: [
                { cells: ['0 (greenMax)', 'No', 'Low'] },
                { cells: ['1–2 (amberMax)', 'Yes', 'Medium'] },
                { cells: ['> 2', 'Yes', 'High'] },
              ],
            },
          },
        ],
      },
      {
        id: 18,
        slug: 'amount-digit-distribution',
        title: 'amount-digit-distribution',
        subtitle: "Benford's Law Analysis",
        sections: [
          {
            title: 'Purpose',
            content:
              "Apply Benford's Law to detect fraud. Naturally occurring financial data follows a logarithmic distribution of leading digits — \"1\" appears ~30% of the time, \"2\" ~17.6%, \"3\" ~12.5%, and so on. Fabricated amounts tend to deviate from this distribution because humans do not intuitively generate Benford-distributed numbers.",
          },
          {
            title: 'How It Works',
            content:
              'Requires a minimum of 50 transactions for statistical reliability. The leading digit (1–9) of each transaction amount is extracted and counted. Observed frequencies are compared to Benford\'s expected frequencies using the Mean Absolute Deviation (MAD) — the average absolute difference across all 9 digits. The most over-represented digit is also identified and included in evidence.',
          },
          {
            title: 'Decision Table by MAD',
            content: '',
            table: {
              headers: ['MAD Range', 'Severity', 'Score', 'Interpretation'],
              rows: [
                { cells: ['< 0.006', 'Low — not triggered', '10', "Conforms to Benford's Law"] },
                { cells: ['0.006 – 0.012', 'Medium', '55', 'Acceptable deviation'] },
                { cells: ['0.012 – 0.015', 'High', '75', 'Nonconforming distribution'] },
                { cells: ['≥ 0.015', 'High', '90', 'Fraud-suspect distribution'] },
              ],
            },
          },
        ],
      },
      {
        id: 19,
        slug: 'cloned-transaction-pattern',
        title: 'cloned-transaction-pattern',
        subtitle: 'Duplicate / Fabrication Detection',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect copy-pasted or fabricated transaction entries — a hallmark of manipulated bank statements where a real transaction is duplicated, sometimes with only the date or reference number changed to make it appear unique.',
          },
          {
            title: 'How It Works — Two Detection Passes',
            content:
              'Pass 1 — Same-day exact duplicates: Transactions are grouped by an exact key: date + amount + direction + description. Any group with 2+ identical entries is flagged immediately.\n\nPass 2 — Near-duplicate clusters: Transactions are grouped by a clone key: amount + direction + normalized description. Description normalization strips trailing reference codes (REF0001, TXN20241105) and long numeric suffixes. If any two consecutive transactions in a group are within 20 days of each other, the entire group is flagged.\n\nThe clone ratio = evidence count / total transactions.',
          },
          {
            title: 'Decision Table',
            content: '',
            table: {
              headers: ['Condition', 'Severity', 'Score'],
              rows: [
                { cells: ['Same-day exact duplicates found, OR clone ratio ≥ 30%', 'High', '90'] },
                { cells: ['Clone ratio ≥ 15%', 'High', '75'] },
                { cells: ['Clone ratio ≥ 5%', 'Medium', '55'] },
                { cells: ['Clone ratio < 5% (no same-day dupes)', 'Not triggered — Low', '10'] },
              ],
            },
          },
        ],
      },
      {
        id: 20,
        slug: 'round-amount-concentration',
        title: 'round-amount-concentration',
        subtitle: 'Whole-number Amount Concentration',
        sections: [
          {
            title: 'Purpose',
            content:
              'Detect suspiciously high concentrations of whole-number (round) transaction amounts. Real bank statements naturally produce many amounts with cent values (e.g. ₱1,234.56) due to fees, interest, and merchant pricing. A statement where nearly every amount is a clean integer strongly suggests the data was manually fabricated rather than exported from a real banking system.',
          },
          {
            title: 'How It Works',
            content:
              'Requires a minimum of 10 transactions to be meaningful. An amount is considered "round" if it has no fractional part — i.e., amount % 1 === 0. The round-amount ratio is computed as count of round transactions / total eligible transactions.',
          },
          {
            title: 'Decision Table',
            content: '',
            table: {
              headers: ['Round-amount Ratio', 'Triggered', 'Severity', 'Score', 'Interpretation'],
              rows: [
                { cells: ['< 60%', 'No', 'Low', '10', 'Normal range — real statements mix round and non-round amounts'] },
                { cells: ['60–74%', 'Yes', 'Medium', '55', 'Elevated concentration — unusually high proportion of whole-number amounts'] },
                { cells: ['75–89%', 'Yes', 'High', '75', 'High concentration — majority lack cent values, suggesting manual fabrication'] },
                { cells: ['≥ 90%', 'Yes', 'High', '90', 'Extreme concentration — nearly all amounts are whole numbers, strong fabrication indicator'] },
              ],
            },
          },
        ],
      },
    ],
  },
]

// ─── Severity badge helper ─────────────────────────────────────────────────────

function severityClass(cell: string) {
  const lower = cell.toLowerCase()
  if (lower === 'high') return 'text-red-600 font-semibold'
  if (lower === 'medium') return 'text-amber-600 font-semibold'
  if (lower === 'low' || lower === 'not triggered' || lower.startsWith('not triggered')) return 'text-emerald-600 font-semibold'
  if (lower === 'yes') return 'text-red-600 font-medium'
  if (lower === 'no') return 'text-emerald-600 font-medium'
  return ''
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DataTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
              {row.cells.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2.5 text-slate-700 align-top ${severityClass(cell)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CheckpointCard({ checkpoint, workflowColor }: { checkpoint: Checkpoint; workflowColor: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0`}>
            #{checkpoint.id}
          </span>
          <div>
            <p className={`text-sm font-mono font-semibold ${workflowColor}`}>{checkpoint.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{checkpoint.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">
        {checkpoint.sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{section.title}</p>
            )}
            {section.content && (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</p>
            )}
            {section.table && (
              <DataTable headers={section.table.headers} rows={section.table.rows} />
            )}
            {section.note && (
              <div className="mt-3 px-4 py-3 bg-slate-50 border-l-4 border-slate-300 rounded-r-lg">
                <p className="text-xs text-slate-600 leading-relaxed">{section.note}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const [activeWorkflow, setActiveWorkflow] = useState(workflows[0].id)

  const current = workflows.find((w) => w.id === activeWorkflow)!

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-8 pt-8 pb-0">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Guides</h1>
        <p className="text-sm text-slate-500 mb-6">
          Technical reference for all 20 risk-engine checkpoints across the four compliance workflows.
        </p>

        {/* Workflow tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {workflows.map((wf) => {
            const active = wf.id === activeWorkflow
            return (
              <button
                key={wf.id}
                onClick={() => setActiveWorkflow(wf.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                  active
                    ? `border-current ${wf.color} bg-white`
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {wf.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {/* Workflow header */}
        <div className={`mb-6 px-5 py-4 rounded-xl border ${current.borderColor} bg-white`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${current.badgeColor}`}>
              {current.checkpoints.length} checkpoints
            </span>
            <span className={`text-base font-bold ${current.color}`}>{current.label}</span>
          </div>
        </div>

        {/* Checkpoint grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {current.checkpoints.map((cp) => (
            <CheckpointCard key={cp.slug} checkpoint={cp} workflowColor={current.color} />
          ))}
        </div>
      </div>
    </div>
  )
}
