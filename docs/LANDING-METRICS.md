# Landing Metrics — event list & monthly review

> EN · [Deutsch](de/LANDING-METRICS.md)

Every CTA on the landing page fires a **GoatCounter event** (cookie-less,
privacy-friendly). Events are only tracked when the counter script is
loaded — a missing counter never breaks the page.

## Event list

| Event | Trigger | Meaning |
|---|---|---|
| `hero_install` | Primary hero CTA (set up free) | Top-of-funnel intent |
| `hero_demo` | Hero CTA "live demo" | Interest in proof |
| `nav_install` | Nav CTA | Returning/fast intent |
| `setup_copy` | Copy-workflow button | Active setup start |
| `demo_tab_vuln` | Demo tab "attack repo" | Threat curiosity |
| `demo_tab_clean` | Demo tab "clean repo" | Control curiosity |
| `pricing_free` | Free card CTA | Install intent |
| `pricing_pro` | Pro CTA + Free-card upsell link | Pro interest (money signal) |
| `pricing_audit` | Audit card CTA | Audit interest ($499 signal) |
| `pricing_redteam` | RedTeam card CTA | RedTeam interest ($499/quarter signal) |
| `audit_request` | "First scan free" line | Soft request intent |
| `faq_open` | Any FAQ item opened | Objection research |
| `footer_marketplace` | Footer marketplace link | Distribution check |
| `footer_github` | Footer GitHub link | Trust/research check |

## Monthly review process (what to do with the numbers)

1. **Install CTR ≥ 3 %** of pageviews: `(hero_install + nav_install + pricing_free + setup_copy) / pageviews`.
   Below 3 % → hero copy or CTA placement is weak; test headline variants.
2. **Audit requests ≥ 1 %**: `(pricing_audit + pricing_redteam + pricing_pro + audit_request) / pageviews`.
   Below 1 % → pricing section too far down or objection not addressed;
   move one money CTA into the hero and re-check FAQ-open rate.
3. **Pro/RedTeam mix**: `pricing_pro / pricing_audit` shows whether the
   recurring product or the one-time audit resonates — steer the
   outreach pitch accordingly.
4. **Setup funnel**: `setup_copy / hero_install` below 40 % → the setup
   block is unclear; simplify the snippet or the step copy.

Review on the 1st of each month against GoatCounter dashboard; log the
numbers in this file under "## History".

## History

_No entries yet._
