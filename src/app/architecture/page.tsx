import {
  UploadIcon,
  DatabaseIcon,
  GitForkIcon,
  AnalysisIcon,
  FileTextIcon,
  ArrowDownIcon,
} from '@/components/icons'

const steps = [
  {
    step: 1,
    title: 'File Upload',
    description: 'User uploads CSV/XLSX/PDF files per workflow',
    Icon: UploadIcon,
    badges: null as string[] | null,
    green: false,
  },
  {
    step: 2,
    title: 'Data Parsing & Validation',
    description: 'Extract structured data, validate schema and completeness',
    Icon: DatabaseIcon,
    badges: null as string[] | null,
    green: false,
  },
  {
    step: 3,
    title: 'Workflow Routing',
    description: 'Route data to the selected compliance workflow engine',
    Icon: GitForkIcon,
    badges: ['Affordability', 'Gambling', 'AML'],
    green: false,
  },
  {
    step: 4,
    title: 'Analysis & Rule Engine',
    description: 'Apply compliance rules, thresholds, and risk scoring algorithms',
    Icon: AnalysisIcon,
    badges: null as string[] | null,
    green: false,
  },
  {
    step: 5,
    title: 'Report Generation',
    description:
      'Automated compliance report with findings, risk flags, and recommendations',
    Icon: FileTextIcon,
    badges: null as string[] | null,
    green: true,
  },
]

const badgeColors: Record<string, string> = {
  Affordability: 'bg-indigo-50 text-indigo-700',
  Gambling: 'bg-amber-50 text-amber-700',
  AML: 'bg-rose-50 text-rose-700',
}

export default function ArchitecturePage() {
  return (
    <div className="flex-1 p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">Architecture Overview</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="max-w-lg mx-auto flex flex-col items-center">
          {steps.map((step, index) => {
            const { Icon } = step
            return (
              <div key={step.step} className="w-full flex flex-col items-center">
                <div
                  className={`w-full rounded-xl border px-6 py-5 ${
                    step.green
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        step.green ? 'text-emerald-600' : 'text-indigo-500'
                      }`}
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      {step.step}. {step.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-8">{step.description}</p>
                  {step.badges && (
                    <div className="flex gap-2 mt-3 ml-8">
                      {step.badges.map((badge) => (
                        <span
                          key={badge}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeColors[badge]}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <ArrowDownIcon className="w-5 h-5 text-slate-300 my-2" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
