'use client';

interface Props {
  summary?: Record<string, unknown>;
}

export default function CompanyProfile({ summary }: Props) {
  const profile = summary?.assetProfile as Record<string, unknown> | undefined;

  if (!profile) {
    return (
      <div className="text-bloomberg-text-muted text-xs p-2">
        Company profile unavailable
      </div>
    );
  }

  const fields: { label: string; value: string | undefined }[] = [
    { label: 'Sector', value: profile.sector ? String(profile.sector) : undefined },
    { label: 'Industry', value: profile.industry ? String(profile.industry) : undefined },
    { label: 'Country', value: profile.country ? String(profile.country) : undefined },
    { label: 'Employees', value: profile.fullTimeEmployees ? Number(profile.fullTimeEmployees).toLocaleString() : undefined },
    { label: 'Website', value: profile.website ? String(profile.website) : undefined },
  ];

  return (
    <div>
      <div className="space-y-1 mb-3">
        {fields.map(
          (field) =>
            field.value && (
              <div
                key={field.label}
                className="flex justify-between py-0.5 border-b border-bloomberg-border/50"
              >
                <span className="text-bloomberg-text-muted text-xs">
                  {field.label}
                </span>
                <span className="text-bloomberg-text-secondary text-xs">
                  {String(field.value)}
                </span>
              </div>
            )
        )}
      </div>
      {profile.longBusinessSummary ? (
        <p className="text-bloomberg-text-muted text-[11px] leading-relaxed line-clamp-6">
          {String(profile.longBusinessSummary)}
        </p>
      ) : null}
    </div>
  );
}
