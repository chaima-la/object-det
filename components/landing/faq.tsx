"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "How does the object detection work?",
    answer:
      "Our object detection uses TensorFlow.js with the COCO-SSD model, which runs entirely in your browser. When you upload an image or use your camera, the AI model analyzes the visual data and identifies objects, drawing bounding boxes around each detected item.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes! All image processing happens locally in your browser. Your images are never uploaded to our servers. This means your data stays completely private and secure on your device.",
  },
  {
    question: "What objects can be detected?",
    answer:
      "The COCO-SSD model can detect 80+ common object classes including people, vehicles (cars, trucks, bicycles), animals (dogs, cats, birds), household items (chairs, tables, TVs), and much more.",
  },
  {
    question: "Does it work on mobile devices?",
    answer:
      "Yes! VisionAI works on any device with a modern web browser, including smartphones and tablets. The camera detection feature uses your device's camera for real-time object detection.",
  },
  {
    question: "Can I use this for commercial projects?",
    answer:
      "The free tier is great for personal and small projects. For commercial use with API access and higher volume, check out our Pro and Enterprise plans which offer additional features and support.",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">Everything you need to know about VisionAI.</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium text-foreground pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
