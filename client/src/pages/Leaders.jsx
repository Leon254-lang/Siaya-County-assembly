const leaders = [
  {
    name: 'Rt. Hon. George Owino Okode, MBS',
    position: 'Speaker',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2024/01/WhatsApp-Image-2024-01-19-at-12.50.04-PM-240x300.jpeg',
    description: 'The Rt. Hon. George Owino Okode, MBS is the Speaker of the County Assembly of Siaya. He was overwhelmingly elected as Speaker of the Third County Assembly of Siaya on Tuesday, 20th September, 2022 after garnering 38 out of the 40 votes cast. Speaker Okode is serving as the County Assembly Speaker for the third uninterrupted term having been elected for the first time in March 2013. He attributes this fete to his open-door policy and regular consultations with the Members of the County Assembly. The Hon. Speaker Okode is a distinguished advocate of the High Court of Kenya and possesses exceptional grasp of parliamentary practices and procedures. Speaker Okode observes that the relationship between the County Assembly and the County Executive should be based on the understanding that oversight is not policing or compromise. For three months, Speaker Okode acted as Siaya County Governor in 2013 when the High Court nullified the election of Governor Cornel Rasanga.',
  },
  {
    name: 'HON. ODONGO ANDERICUS ODUOR',
    position: 'MCA UGENYA WEST WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Odongo-Andericus-Oduor-500x500.jpg',
    description: 'Member of County Assembly representing Ugenya West Ward.',
  },
  {
    name: 'HON. OTIENO EDWIN MARTIN',
    position: 'MCA UGUNJA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Otieno-Edwin-Martin-500x500.jpg',
    description: 'Member of County Assembly representing Ugunja Ward.',
  },
  {
    name: 'HON. BONYO BOOKER WASHINGTON',
    position: 'MCA UYOMA NORTH WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Bonyo-Washington-Booker-2-500x500.jpg',
    description: 'Member of County Assembly representing Uyoma North Ward.',
  },
  {
    name: 'HON. ODINGA TRUPHOSA OSEWE',
    position: 'MCA WEST SAKWA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Odinga-Truphosa-Apondi-Osewe-2-500x500.jpg',
    description: 'Member of County Assembly representing West Sakwa Ward.',
  },
  {
    name: 'HON. BARAKA SETH OCHIENG',
    position: 'MCA EAST GEM WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/HonOchieng-Seth-Baraka-500x500.jpg',
    description: 'Member of County Assembly representing East Gem Ward.',
  },
  {
    name: 'HON. OKWIRRY SUSAN ACHIENG',
    position: 'MCA WEST GEM WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/hon.-susan-okwiri-1-500x500.jpg',
    description: 'Member of County Assembly representing West Gem Ward.',
  },
  {
    name: 'HON. OMWENDE ANDREW OMOLO',
    position: 'MCA SIGOMRE WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Omolo-Andrew-Omwende-2-500x500.jpg',
    description: 'Member of County Assembly representing Sigomre Ward.',
  },
  {
    name: 'HON. OKEYO MARK OKEYO',
    position: 'MCA WEST ASEMBO WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Okeyo-Mark-Okeyo-2-500x500.jpg',
    description: 'Member of County Assembly representing West Asembo Ward.',
  },
  {
    name: 'HON. ACHIENG EUNICE RAHEL',
    position: 'MCA SOUTH SAKWA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Achieng-Eunice-Rahel-500x500.jpg',
    description: 'Member of County Assembly representing South Sakwa Ward.',
  },
  {
    name: 'HON. OLUOCH PHILIP OBONYO',
    position: 'MCA NORTH GEM WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Abuba-Philip-Obonyo-Oluoch-500x500.jpg',
    description: 'Member of County Assembly representing North Gem Ward.',
  },
  {
    name: 'HON. ODAWA VINCENT OTIENO',
    position: 'MCA NORTH ALEGO',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Odawa-Vincent-Otieno-500x500.jpg',
    description: 'Member of County Assembly representing North Alego.',
  },
  {
    name: 'HON. OTIATO FRANCIS OTIENO',
    position: 'MCA YIMBO EAST WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Otiato-500x500.jpg',
    description: 'Member of County Assembly representing Yimbo East Ward.',
  },
  {
    name: 'HON. ANYANGO SILAS MADINGU',
    position: 'MCA CENTRAL GEM WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Anyango-Silas-Madingu-500x500.jpg',
    description: 'Member of County Assembly representing Central Gem Ward.',
  },
  {
    name: 'HON. OMORO FREDRICK OLUOCH',
    position: 'MCA EAST UGENYA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Omoro-Fredrick-Oluoch-2-500x500.jpg',
    description: 'Member of County Assembly representing East Ugenya Ward.',
  },
  {
    name: 'HON. OTARE JAMES OBIERO',
    position: 'MCA SIAYA TOWNSHIP WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Otare-James-Obiero-500x500.jpg',
    description: 'Member of County Assembly representing Siaya Township Ward.',
  },
  {
    name: 'HON. KINYANYI WILLIAM ONYANGO',
    position: 'MCA YALA TOWNSHIP WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/HON.-WILLIAM-KINYANYI-ONYANGO-500x500.jpg',
    description: 'Member of County Assembly representing Yala Township Ward.',
  },
  {
    name: 'HON. MASIDIS SCOLASTICA MADOWO',
    position: 'MCA SOUTH EAST ALEGO WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Madowo-Scholastica-Masidis-Owoko-500x500.jpg',
    description: 'Member of County Assembly representing South East Alego Ward.',
  },
  {
    name: 'HON. ARIKA OLIVER',
    position: 'MCA NORTH SAKWA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-ArikaOliver-Otieno-500x500.jpg',
    description: 'Member of County Assembly representing North Sakwa Ward.',
  },
  {
    name: 'HON. OKUMU FELIX OUMA',
    position: 'MCA WEST ALEGO WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/HON.-FELIX-OUMA-OKUMU-500x500.jpg',
    description: 'Member of County Assembly representing West Alego Ward.',
  },
  {
    name: 'HON. MADIALO SYLVESTER OTIENO',
    position: 'MCA USONGA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Madialo-Sylvester-Otieno-500x500.jpg',
    description: 'Member of County Assembly representing Usonga Ward.',
  },
  {
    name: 'HON. ONGUURU GORDON',
    position: 'MCA EAST ASEMBO WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Onguuru-Gordon-Onyango-500x500.jpg',
    description: 'Member of County Assembly representing East Asembo Ward.',
  },
  {
    name: 'HON. ANGULE SIMEON',
    position: 'MCA WEST YIMBO WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Angule-Simon-Otieno-2-500x500.jpg',
    description: 'Member of County Assembly representing West Yimbo Ward.',
  },
  {
    name: 'HON. APODO JOHN OTIENO',
    position: 'MCA SIDINDI WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Apodo-John-Otieno-500x500.jpg',
    description: 'Member of County Assembly representing Sidindi Ward.',
  },
  {
    name: 'HON. RAGEN DAVID OMONDI',
    position: 'MCA CENTRAL ALEGO WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/05/Hon.-Ragen-David-Omondi-2-500x500.jpg',
    description: 'Member of County Assembly representing Central Alego Ward.',
  },
  {
    name: 'HON. OTIENO JOSEPH BISMARCK OLANG\'O',
    position: 'MCA CENTRAL SAKWA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/09/Hon.-Otieno-Joseph-Bismarck-Olango-2-1-500x500.jpg',
    description: 'Member of County Assembly representing Central Sakwa Ward.',
  },
  {
    name: 'HON. ADALLA BENARD ONYANGO',
    position: 'MCA NORTH UGENYA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/09/Hon.-Adala-Benard-Onyango-500x500.jpg',
    description: 'Member of County Assembly representing North Ugenya Ward.',
  },
  {
    name: 'HON. OGUTA JUSTUS OBUYA',
    position: 'MCA WEST UYOMA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/09/Hon.-Obuya-Justus-Oguta-2-500x500.jpg',
    description: 'Member of County Assembly representing West Uyoma Ward.',
  },
  {
    name: 'HON. ADIALA MICHAEL OTIENO',
    position: 'MCA SOUTH UYOMA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/09/Hon.-Otieno-Michael-Omondi-2-500x500.jpg',
    description: 'Member of County Assembly representing South Uyoma Ward.',
  },
  {
    name: 'HON. ODUOR JOSEPH PETER OMONDI',
    position: 'MCA UKWALA WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2020/09/Hon.-Omondi-Joseph-Peter-2-500x500.jpg',
    description: 'Member of County Assembly representing Ukwala Ward.',
  },
  {
    name: 'HON. BRIAN CHIENG\' ANYANGO OBIERO',
    position: 'MCA SOUTH GEM WARD',
    image: 'https://siayaassembly.go.ke/wp-content/uploads/2023/02/WhatsApp-Image-2023-02-16-at-3.27.14-PM-500x500.jpeg',
    description: 'Member of County Assembly representing South Gem Ward.',
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