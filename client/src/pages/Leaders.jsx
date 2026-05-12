const leaders = [
  {
    name: 'Rt. Hon. George Owino Okode, MBS',
    position: 'Speaker',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2024/01/WhatsApp-Image-2024-01-19-at-12.50.04-PM-240x300.jpeg',
    description: 'The Speaker of the County Assembly of Siaya, serving since 2013.',
  },
  {
    name: 'Hon. Odongo Andericus Oduor',
    position: 'MCA Ugenya West Ward',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Odongo-Andericus-Oduor-500x500.jpg',
    description: 'Member of County Assembly representing Ugenya West Ward.',
  },
  {
    name: 'Hon. Otieno Edwin Martin',
    position: 'MCA Ugunja Ward',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Otieno-Edwin-Martin-500x500.jpg',
    description: 'Member of County Assembly representing Ugunja Ward.',
  },
  {
    name: 'Hon. Bonyo Booker Washington',
    position: 'MCA Uyoma North Ward',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Bonyo-Washington-Booker-2-500x500.jpg',
    description: 'Member of County Assembly representing Uyoma North Ward.',
  },
  {
    name: 'Hon. Odinga Truphosa Osewe',
    position: 'MCA West Sakwa Ward',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Odinga-Truphosa-Apondi-Osewe-2-500x500.jpg',
    description: 'Member of County Assembly representing West Sakwa Ward.',
  },
];

export default function Leaders() {
  return (
    <div className="page">
      <h1>Know Your Leaders</h1>
      <p>Meet the elected officials and key personnel leading Siaya County Assembly.</p>
      <div className="leaders-grid">
        {leaders.map((leader, index) => (
          <div key={index} className="leader-card">
            <img src={leader.image} alt={leader.name} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '50%' }} />
            <h3>{leader.name}</h3>
            <p>{leader.position}</p>
            <p>{leader.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}