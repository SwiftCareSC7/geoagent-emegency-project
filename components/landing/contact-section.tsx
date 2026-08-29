import { Ambulance, Mail, MapPin, Phone } from 'lucide-react'

import { SITE_CONTACT } from '@/lib/mock-data'

const details = [
  {
    icon: Phone,
    label: 'Control room',
    value: SITE_CONTACT.phone,
  },
  {
    icon: Mail,
    label: 'Email',
    value: SITE_CONTACT.email,
  },
  {
    icon: MapPin,
    label: 'Base',
    value: SITE_CONTACT.base,
  },
]

export function ContactSection() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-20 border-t border-border bg-secondary/40"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2
              id="contact-heading"
              className="font-display text-3xl font-bold text-balance text-foreground"
            >
              SwiftCare Bengaluru Support
            </h2>
            <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Reach the Bengaluru control room for dispatch coordination,
              onboarding support, or questions about the GeoAgent prototype.
            </p>
            <dl className="mt-8 space-y-4">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex items-center justify-center rounded-2xl border border-border bg-primary p-8 text-primary-foreground">
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10">
                <Ambulance className="size-7" />
              </span>
              <p className="mt-4 font-display text-xl font-bold">
                Available 24 / 7
              </p>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Emergency coordination never sleeps. SwiftCare GeoAgent keeps
                every crew informed, every second of every shift.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
