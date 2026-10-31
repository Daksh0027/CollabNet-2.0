import { AccordionV2, AccordionV2Item, AccordionV2Type } from '@juspay/blend-design-system'
import { content } from '../content'
import { SectionHeader } from './SectionHeader'

export function Faq() {
  const { faq } = content
  return (
    <section id="faq" className="section section--narrow" aria-labelledby="faq-title">
      <SectionHeader id="faq-title" eyebrow={faq.eyebrow} title={faq.heading} />
      <div className="faq">
        <AccordionV2 accordionType={AccordionV2Type.BORDER} width="100%" defaultValue={faq.items[0]?.id}>
          {faq.items.map((item) => (
            <AccordionV2Item key={item.id} value={item.id} title={item.question}>
              <p className="faq__answer">{item.answer}</p>
            </AccordionV2Item>
          ))}
        </AccordionV2>
      </div>
    </section>
  )
}
