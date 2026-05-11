import { useState } from 'react';
import faqData from '../data/faqData';

export default function FAQ() {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="page faq-page">
      <h1>Frequently Asked Questions</h1>

      {/* Category Accordions */}
      <div className="faq-sections">
        {faqData.map((section, index) => (
          <div key={index} className="faq-section-wrapper">
            <button
              className={`faq-category-button ${expandedSections[index] ? 'expanded' : ''}`}
              onClick={() => toggleSection(index)}
            >
              <span className="category-text">{section.category}</span>
              <span className="category-icon"></span>
            </button>

            {expandedSections[index] && (
              <div className="faq-content">
                <div className="faq-items">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="faq-item">
                      <h3>{item.question}</h3>
                      <p>{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

