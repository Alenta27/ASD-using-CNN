import React from 'react';

const articles = [
  {
    id: 'asd-basics',
    title: 'Understanding Autism Spectrum Disorder (ASD)',
    category: 'ASD',
    summary: 'Signs, early interventions, and support strategies for families.',
    link: 'https://www.cdc.gov/ncbddd/autism/index.html',
  },
  {
    id: 'adhd-guide',
    title: 'ADHD in Children: A Practical Guide for Parents',
    category: 'ADHD',
    summary: 'Symptoms, diagnosis, behavioral strategies, and school support.',
    link: 'https://www.cdc.gov/ncbddd/adhd/facts.html',
  },
  {
    id: 'down-syndrome-overview',
    title: 'Down Syndrome: Overview and Early Support',
    category: 'Down Syndrome',
    summary: 'Development, health, and inclusive learning tips.',
    link: 'https://www.ndss.org/about-down-syndrome/',
  },
  {
    id: 'parenting-resources',
    title: 'Evidence-based Parenting Resources',
    category: 'General',
    summary: 'Curated reputable links to get trustworthy information quickly.',
    link: 'https://www.aap.org/en/patient-care/',
  },
];

export default function LearningHub() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Learning Hub</h1>
        <p className="text-gray-600 mb-6">Articles and guides on ASD, ADHD, and Down syndrome.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((a) => (
            <a key={a.id} href={a.link} target="_blank" rel="noreferrer" className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="text-sm text-indigo-600 font-semibold">{a.category}</div>
              <h3 className="text-xl font-semibold text-gray-800 mt-1">{a.title}</h3>
              <p className="text-gray-600 mt-2 text-sm">{a.summary}</p>
              <div className="mt-3 text-indigo-600 text-sm font-medium">Read more →</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}