import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const normalizeRole = (value) => {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') return value.name || value.role || '';
    return '';
  };

  const isLoggedIn = !!localStorage.getItem('icamsToken');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      const name = storedUser?.name || localStorage.getItem('userName') || 'User';
      const role = normalizeRole(storedUser?.role || localStorage.getItem('userRole'));
      setUserName(name);
      setUserRole(role);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      } else {
        setIsDesktopMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAllowedLinks = (role) => {
    const normalizedRole = normalizeRole(role);
    const allLinks = [
      { to: '/documents', label: 'Documents', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer', 'Procurement Officer'] },
      { to: '/announcements', label: 'Announcements', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'] },
      { to: '/messages', label: 'Messages', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'] },
      { to: '/audit-logs', label: 'Audit Logs', roles: ['Super Admin', 'ICT Admin'] },
      { to: '/manage-users', label: 'Manage Users', roles: ['Super Admin'] },
      { to: '/committees', label: 'Committees', roles: ['Super Admin', 'Committee Officer', 'Clerk', 'HR Officer'] },
      { to: '/attendance', label: 'Attendance', roles: ['Super Admin', 'ICT Admin', 'HR Officer', 'Clerk', 'Finance Officer', 'Committee Officer', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'] },
      { to: '/visitors', label: 'Visitors', roles: ['Super Admin', 'Security Officer'] },
      { to: '/meetings', label: 'Meetings', roles: ['Super Admin', 'Committee Officer', 'HR Officer'] },
      { to: '/sessions', label: 'Sessions', roles: ['Super Admin', 'Committee Officer', 'Clerk'] },
      { to: '/mcas', label: 'MCAs', roles: ['Super Admin', 'HR Officer', 'Committee Officer', 'Clerk'] },
      { to: '/assets', label: 'Assets', roles: ['Super Admin', 'Finance Officer'] },
      { to: '/finance', label: 'Finance', roles: ['Super Admin', 'Finance Officer'] },
      { to: '/procurement', label: 'Procurement', roles: ['Super Admin', 'ICT Admin', 'Procurement Officer'] },
      { to: '/bills', label: 'Bills', roles: ['Super Admin', 'Clerk', 'Committee Officer', 'MCA'] },
      { to: '/voting', label: 'Voting', roles: ['Super Admin', 'Clerk', 'Committee Officer', 'MCA'] },
      { to: '/tickets', label: 'Helpdesk', roles: ['Super Admin', 'ICT Admin'] },
      { to: '/interns', label: 'Interns', roles: ['Super Admin', 'HR Officer', 'Intern'] },
      { to: '/leaders', label: 'Leaders', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
      { to: '/feedback', label: 'Public', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
      { to: '/faq', label: 'FAQ', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
      { to: '/media', label: 'Media', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
    ];
    return allLinks.filter(link => link.roles.includes(normalizedRole));
  };

  const allowedLinks = getAllowedLinks(userRole);
  const logoSrc = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBwgHBgkIBwgKCgkLDRYPDQwMDRsUFRAWIB0iIiAdHx8kKDQsJCYxJx8fLT0tMTU3Ojo6Iys/RD84QzQ5OjcBCgoKDQwNGg8PGjclHyU3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3Nzc3N//AABEIAMAAzAMBIgACEQEDEQH/xAAcAAABBAMBAAAAAAAAAAAAAAAGAAQFBwECAwj/xABOEAABAwMBBAUHCAcECAcBAAABAgMEAAURIQYSEzFBUWFxgQcUIjKRodEVFiNCcpOxwSQzUlRVYpRDU5LhRGODorLS4vAXNDVzdILxCP/EABoBAAIDAQEAAAAAAAAAAAAAAAAEAQIDBQb/xAAxEQACAgECAwYEBQUAAAAAAAAAAQIDEQQhEhMxFSIyQVHwFFJxkQUzocHxYYGx0eH/2gAMAwEAAhEDEQA/ALxpUqVACoT21BdumybLn/l13cKX1FSWXFIB8R7qLKhtrLQq8WktMLDUyO4mREdP1Hkap8Dqk9hNAEujlpW1RWzt4ReIHG3CzIbUW5DCvWacHNJ/LrGKlaAFSpUqAFgVWXla2cfHB2ssYUi525SVO8MekpAPrduOkdKc1ZtaKAKSDgg880AQWxW0rG1NjZuDJCXfVfaBzw19I+FT55VR9wePkt28W5biX7TcBvOQWlAqT2AdBB5dhxXS633avarKXHzZLYr+wjHLqh/Mvn7MeNUnZGCzJlJzjBZkyzr7tjYLCk/KdyZbWP7JKt5f+EUK/wDjBaeOCbXdUwv3oxzunw50JwNn7ZbzvtRg699Z5/01HxNSmByIyMUlLXxz3UKvWR8kWHYdr7Dfwn5LuTLqz/ZFW6v2Gp0VRU/Z22TFcQscF/mH2DuKB/OnVs2k2s2WIBe+XLYnm08fpkJ/lVz9uR3VvXqq57dGbQ1EJFj7fbUs7KWF2avdVIV6EZpR9dfb2DmaHvJNsvIhRHNob1vOXe5DfK3PWQg669RPPHRoOihixn/xO26VPuZDdstuCzBWobyuwjv1PcB11dacY0pk3M4rNKlQAqVKkaAMKwBQtsKkNP7RsMgCO3d3i3jkCoJUof4iak9o7v8AJMHeZRx5zx4cSOP7Vw8h3dJPQM1rslZjYrKzDcd48glT0l/peeWd5avFRPhigCZpUqVACpUqVACrBz0Cs0qABPaWO/ZJR2ltjZUEAC5xkj9cwOa0j9tAye0ZHVRNFkNSY7b7C0radSFoUnkpJGQa6LAUkggEdINC+whEVi52YH0LZNW00OhDSsLQnuAVjwoAKqxmsZFCO1PlBsWzzioqn/Pbh0Q4vprB6N4jRPjr2VGfUArffajtKdfcQ22gZUtZwAO01V20vlEmXR9dt2JSCgZS9dHB6Cf/AGx09/szzqBur172wf4u0DiolvBy1bWlEZ+31+Pup+xHajNpajtpQ0nkkCk7tXGG0dxS3VRjtEYW6ysxHVyXnFypzhy5KeOVKP5U4nTfNyhISCpWutO6ZzofnK23AcKQeXXSMJqdmbBOElOffJKyR0zXEcdSt1XNKTgUYytlra3G30h/eI5hw1BWGXbmkpaktYdOiTucz30QXZbKWEpQiQMj9hddSNdMllJM6UYVNbAXeY6YQWppajjkF4NRlunmbvpLe6UYyc6HNOrunzha0MpUTyJXoPxpvb4Zig7ygSrGcdFLalUpYS3Fr41RW3UbXCytSH0zYby4Nwb1blMaEHtxzoi2a8pD1vdRbNtkBlZ9Fq5Nj6NfVv8A7J7fbimNcpUZiWyWZLSXW1c0qrCjVOG0uhjTqHDZ9C4mXW3mkuMuJW2oZSpJyCK6VRtonX/Y1w/IqlXC181QHj6SAf2DVjbKbeWPaVRYjvmNOT68OT6Dg7s+sO6unCyM13TownGfQKyQOdcJ0tiDCfly3UtMMNqccWrklIGSa7ZGNaFtuAZsixWQ54JwngyMfWaaSXSk9hKUg99aFzbZmLIucj5xXVtTbz6cQ4yv9GYPLP8AOrmfAdFFA6qwnTGnRW1ACpUqVACpUqROKAME4x21T7O33yVtBtG1a7Q/cJEi4E5QQltO4kN6nvSasfau6qtdncXHTvznyI8Nr+8eXogd2dT1AGqas1tTZ9pb5bUOKWIymkKcJ1WooBUrxJNZXT4IORnZPgi5ElcbptftFlNxuKbXFJOY0DReOor5+zFaWuzwrWP0Vr085U4rVSvGn+vTSrk2aidnVnMnfOYgMaClSpViYirC1JQkqUcAVmtHWkut7is45ihYzuSsZ3JG0tpC1TXUEsx07xBHrK6E1MP3J6Rs0mQrG+lwt6dWfgcUPKkurjNxiUpaSoEgDmes0UXCFwLI3GTulpKCQve1JOuernXSpa3UOg/ThZUOgHvvtJWpxR3Uq1/wAqy04l1AWg5SeRrlJYMlI9LdPX11tGYRHaDbfIddKW8D3z3ha3he+dzrSpUqXMBHuBHbUddLLBuZCpLP0g1S6j0VpI5HNSNKrRk4vMSYycXlDS33nbDZ7dRCnousQcmJvrgdQX8akGtvflXa3ZlqfbXrfJalOIVxFAoVxG1ITg/aKRXIZ1HMVAzbaq9bZ2m3od4TzkZ9TDv906lClIV4KSDXQ02plOXDIf098py4WX8Dms1E7NXQ3e0MyXWy1JA4clo823U6LSe45qWroDoqVKlQAqVKlQAq0dWltBUogJGpJ5AVh51LLSnFnCUjJNCE6W/tFKatjqhGt6lBcnczvPt6gN5+qCQN7s06aAHFkSraG8/L74/QYwLVsQfrZ0W948k9meuq6eGPKBtVp/pDfL7CautltDLaW20hKEgBKRoAByqprYIB8ou16bjHdd+ma3dxWMegntrHULNbRSyDsjwo0x0UqKOHYMDMCT95/nS4ez/wC4SfvD8a5HKWPEhTs+4F/GlRPwtn/3CT94fjWeFYP3CT94fjU8tfMg7OuBelRRwrB+4SfvP8613NntCIUggnGQ7p/xUcpeqDs670BnGnOtsnd3d4hHQnJxRNwtn/3CT95/1UuFYP3CT94fjQoY6SDs+/yBj2Vjxon4Vg/cJP3h+NLh7P8A7hJ+8PxqOUvmQdn3AxWfGibh7P8A7hJ+8PxpcPZ/9wk/eH40ctfMg7OuBjxpeNE/D2f/AHCT94fjS4Wz/wC4SfvP86OWvmQdnXAx3U2sKd/yp2D+Vh8/7ih+dGPCsH7hK+8/6qhoXyYfKnZUW6M804iG+pxTisgjGnTTOlglZ1NKtJZVLikFFzV82rz8rgEWuaUonJA0ZXyS93ckqPcdMGihKgoZByOsVpIaadYcaeQlbS0lKkrGQQeYNB9gnOWNxdsLhftjK/0ZxzJcbaJO6knpCcczrjGc11BoNaVaoWFpyCCOsVtQAqweVLOKC9rNtYcVp2DbnuLNUNzeb1S31+lyzQBw2rvL1wLkC2P8NDZCVODXeIOo7uj20rdvhlLW8lx3dIWsDlpp78UOWrO4gDmTknsojhKjJ9ZIKlHGnX2mgAzgvecRGns+ugHxqpQC35UNqknmpLKh/gA/KrStaQygM72fRCwO86++qzuSeD5Wbun++hMufiKw1CzUzSrxomeVKsc9eulXFOgZpVilQQNJ0lyMUK4SlNHmUp3h49VRfBlQlRitReXw1lpKWlespRJJzpnXH5VNyMcFZXjGNSeqnUm2yEF1x+U67uqJQN0YAHPHX0nwroaWEZ1vbcWtk4yODe9w0cUBLm6N4dRrRyQ02cOOoR2E604jW9tbr6VKcXlIcQpasEAjTljsrs1EbSW0pbSAtOdNMn8+mpWhb3kyHqMdCPTMjLVuokNlXQN4V3rKre2+sJcAJQVb6eon1dPbXMwFsZ81OOts8j3dVRZosLMWTHUZ6m9KtG1b6d7GDnBHUeqtq57TTwxlGaVYpUAZqK2b+k8r7Y58K1OHu9JI/OpSo3YZPF8ql0exngW1LeereUP+WnNF+YYX+Ase9uluAsJUApwhsZ7Tig67lS2nmkqCXTkZ5d2vsoruyQ6lRICks4ICuRJ5+6hWUuOo/R4B1IyK6okPtj7yphDVrnOhS93DTij6x6R8KMQciqZubi0DiJXuOIVvBQ6COVGNt8o1oVDbE8vMyUgBxIbJBOOYPVQSNfK/dX4FjiRozy2lS39xSm1YO6ASRnqPKquhABaAAAMUceXA/pNkT0fSH8KCIPrJ76kAxtSUqaTvAHvFSrc/g3JhtlsLLYOUk4AJ1A93vqLtH6tNctnVl28POPa/pBBx1cqADM3aQza40hlSOIHnWsKGUkdH4UAPXb5T8pTUstcJbsAsLSD6JKTkEe2rJ+TQbWxEOjjynCFH6qylRB9oFVRcrbcLPtZaJc+Kphp+UtlJV9bKT7uVZ2rMGXg8SQcDkKVIchSrgeR0BUqVKgBaHmMjqp5DuIjNhqSolptPoO5J4Y/mHSB186aVzeC1ANNoKlOKSjAONFEAnwBJ8K3oslCS4SlkVJbhDGVHlTd0pDchlseoQQtHTjHMZrhb5GZc23zENNOxVpAPIOJUMgjPiMdlMJs9U+SJDAMdDQxHxoofzePV1eNa3GYxPXGfXuJlhPCfR18yk92c4+12V0nqY74W6FOU9iXgMIVGB9Er3iFkdKumh/bOc5CtbTkNtxw+dNEqbQTndWFFII6wkgnl7akbE+mPMLRyW5Po9y+g9meR8KawpT0RC4z7QdZypDjCzqNdd093QdD2VMdTHgUmDqxLBxQd5TiwMBayoVtWFNlp7KShyK4nfYVqFAdKSOsVnlzrlXKSm8jkN0sCpUqVZFjNCey16ct22V+ejtoW6+tthCl8khOSdPEeyitR3UlXUM0FbC2S5XaZ8psMKVElTHBxxqEgKIJNdDQrvNi+pexZC7rIMK3vHcU6/JcUoY0Vujl+FQbU1Elchl1sBZUV7p10On5UUS4KFxIzjfopiyFEJ6kZx+VV68tbO0UYD64WlXaP+xXTFDN3G43ugBIGcAaUKOg75wKK71yOefTQuoekaADzy4NZRZn+p1aPaM/lQFC9dPfVs+Vq3mXssX0JyqI8lzw5H8aqaEfTT3UAGdo0bSeqnew8ELelzFAEGQoN47+ftpnaRvMAdB00onsMZqJHbYYSQhIwATk+3poAJyneehjAykqUcfZI/Ogry2xj82olybGV2+a294Z1owZkoM9tvOiUFCSf2uZA69BTbbi2/K2yV1hBO8tyOooHWoaj3iqvdAgXQtLqEuN6pWAoHsNbYoU2d222UjWG3sXS7PtzG46EupTGUoAgY541qQ+fuw38Zlf0qvhXJlpLcvCHVfDG5N4pYqE+fuwv8Ylf0qvhS+fuwv8AGJX9Kr4VHwlvoTzqyaPKtVqBUobwBSMHHPJ0x7Mmof5+7DfxmT/SK+FY+fewgJPyxJyenzVWfwq8NLbF5wVdsGTYGBgDGABnrrkWEGQle6C6Rwwvp7Pf+JqK+fuwv8Ylf0qvhWFbd7CqGDeZXeIqgR7qiGltjLLQO2DRNtOlC0vIAw0QoZH19d1Pt17kmknrUSok5JPT21BI232EScpvMoelnWMrn11v8/dhum8yv6VXwq09PY0oxW31IVkM5ZNc2d7GiXTp9pOfyrOD086gjtzsIVb3yxJz/wDFVW3z92Gx/wCsSv6VXwqJ6a2WNv1JjbBMm6VQvz82G/jcn+lV8KXz72G/jcn+lV8Kp8Jb6FudAcbRTPk+wz5ZIy0yrAPXjT30U+S+3G17C2phYwpbXEV3q1/Oq02rv9j2kjwrNs5OdlPzZjbbwU0UbqM56R1gVeEZlEeM2w2MIbQEjuAxT2lqlXHvC901NrAz3R5q6k6YdXnxOfzqur3ETG2jgP4wh0qTjqVgnH41YLkpDjj7acY3jukciRzoZvcVqUUh0H6NYWkpOCCKaMQVvPqeFC7iglRBFFN6/VmhRwZWTUgehrrDTcLbKhrAIfaUjXtFefI6ShzhrHpoUUnPQRzr0fVG7XwvMtsLgylO6lbodQAOe+ArTxJFQBI2RYU0MHl0UXQFhtG+cYAzUXIgJtrVtilIDwihb2OlSlE/EU8bQFx1oWAobu9jtT6X5UASTeUtxVcnFvtnXtWMj2H8aKKgIrZdfiJIB3V7yhjlgZB9pqe6BigDxhcWihZyMFtam1eBIpjiiXa2KmLtZfISVoWgTXS2UHIwVE48M48KGiN0kYxigDGKWKzSoIMYrONcUsezrqa2e2aul+WpMCC++hKTlaUHdzjQZ5ZzQBCYrZKSpQCQSToAKlbts1e7KneutrlRk49dbZKfaNKM/Ilswzeb6/dZZSqPaglwNnULcOd3PYME+ygkB7nYbvamG37lbJcVlz1FutFKT49fZTNyJIaYQ+5HdQy56jikEJV3E6GvZZY46N1x0qJAKkKSlSR2YI5UP7c2l+87K3O2cIPLeawxxAkAOA+gQRy16/bQB5PxWMU+u9qm2ac5CucdcaQ36yF/j3UyoIMYpYrNbstl1xKRqCdaALK8hNpRP2yafdTlMJhckfbyEJ9yifCvR7gPDOOeOdUD5CbzCt+00yJJw2Z7SGozh0G8gklHjnT7NX+TkYoJBML3ILDyz6mCSnkf2vx/GmlxIzpr3U/mNiPCdQU/qysBA/ZGcD2ZqOmNcBCmUnIb+jz9kAH3g0ACN9UAnd6TmhZXPrqwpVvTO2cuTjaSX4ziXhjmU4II/H3VXrmd84ydeipA9GuPNtjLi0oH8xAoekWa0Tto03iRKaddbaS221vp3QQSd7nqdfdQPLYtM04lwZbqetU90n36VxTYrOzFeft6WHOGkqLE9HpjtQ6nHLqNVru009lPf6Ci1LlLCX6knf5oud9kON4LTWG2yDzx/nn206sx4MkK54PJXVyI8fwzUBah9GgqGQTz5aEgfkaIoSQN0nByOXh8Ar21Z7Ma3DK2RS0S6o503Wznmjn7aF/KltkNmbMGISsXOYChj/VDpWfy7afq2vs9pgvtzpiPOobZKmP7RzqCB9YnQaddUnGjXTyi7aKVMUWA6d55WfRjMj6ozzPR2k5o4WHEvUl/Jj5O2dp48m5XlLoi4UiOd4pUtzpXkHJx7z11XG1NmlWO9S4ExOHmXN1WnPTIV3EaivUa75s7szBYhCZHabYbCGY7Ppr3QNAEpyTVUeVhn5x8O7otxgoba4aDKcCXpSc5G62NfR1OT0VZVyazgrzI5xkpulW7rZaWUq5/jWlULln+STY2x3q3XK97SlbkWIvhpYDhSCd0KySCCeegq9ILFutcJpi1ttRm0JG6wjITg9BH51Q/kXLU66O2qU6tMdKky+Hvei4UqQnB7s5r0O47HTIaiL3QpxJUlONNMZ/Ggqm87kfdGG5MJxIbYnvKGS28grQewAer1ZqqrntG1sVtIZcW1Kgs3FrgT4hxhDg9RxPLOhVr09+Sbt3QE6AAdlUp/wD0ZIhhuzRUhJmqUt0kHUNjQZ7yTjuNBDTyTsratmbOTJt0pTCXo7TClJ0ON4qUe8AYB/mo2tdzjXVtMRO9vebpW6ArO5vcgVdZxXnCH8oRosS2wCkSCnivqXqGweQ/76qmJ2220my0BECFLhgPpJU4iKErHRnOde+qp7ilNkua4tkL5Wb07edtJnGSkCGfNUlJB3gkn0j2mg6tnXFuuLcdUVuLUVKUTkknmTWtWHRd1Gnku2VVtLtGww6lXmrf0kk9TY6P/scChODGXJfS22lSiogAJGSSegV6G8lD2z+ztm8yenNsXZ5W9KTJSWjvDQJTvYyE8tOZyalRb6A5JdQU8rexo2fnsXuzNlmC6oBSWRgR3egjqB6O3wqx/JjtgnamzFMhQFyigIkJ/a6ljv8AxqfuqbVeLXIgzXo7sWQ2ULHEGCDXn62IuOxW2nEtrqJSWHd0qbUCmS0roOOnl3EVKhJ+RDnFeZ6CuEUJdMjTczvLSTzUNAB351oGuf0j6nBvHeJKjnBPPU+HvzUydoZl1IQbNKhwSkqDkohK3cDkEAkgY6e0VGy0niYPMq17Tkg+8E+NDi4sFJS6Gmytzj225vMzXENx5DeCpeiQR1+/21xumyWz02YuRAv8WKyvXhAhYB6cHeGnZUHcV7pSsJQohQOFjKTy59mRT52DAcXvS3I4dI1TCt6OGOwFZye+pzVHeyWDO21w6Gq0rbWpK0FC0nBSrQg1zfbDzam1HAVpkVO3Bh1+wwbjKfjPzEjhSHIywtCz0HI6euoWuBdU6bOHPQ5klwS2OqIHEschyG863NiqSteMK3mhzwOsamnMJVxbilyMhu9RQB+k250B9HVvNnp7O2lZpKYtwbW7+qVltwHkUnnUa/Ft9oui4Eq3TIr7AK2LlbFEOLaJ0JSPWA0BxnlrXd/D7edXwvqhiNkpLOTsqfHmOrbFwtL6s4VDvMbzZ1JxjG911ubGl1G8dlbO4Oe+i5At/jTtiRKubQQxPsm0TA0DU9IafHZnHPwrVWzwK8r8nsYr60S/Q/H8qfyl7/gnDe/v9xiX27ZhsS7FZ86Bu2I85kHsB6DS4BjJVOkKVaGXchVwuf0syR1hCD6vsqRWmZamyoo2f2aax6S28Ov47NPjTaFHU+6qfbGlrV/aX69dA/1aD/8AlTle/f8Asq85K2202X4AVcbfBuKLUshKX5TJQQs9f8p6/iKBHEFCyhQwocxXoN42OepTUyfe9pXuS0xwrgjswn0arDbbZKZbVOTkW2ZGtql4bVISMozyCiPdmlLIYeUOV2ZWGC9lusyy3Ni4W5wNyGjoTyUDoUnrBGhq1l+V6HcoMZU2LJhXSIQpt5nC0KPSCOeCKpxSSklKhg1g6isTSUU1hnoE+WeOqwvyotuW9LZThSd7dRk9PXiqkeukvaraZy7Xt0EAcRwj1W0J5JHZUVYnkom8B04akpLSvHl76cSm1Wu1GKrSTKWSvsbScD2nJqDN58GSQVtEzCkSHYzZfceVlS1eiMDkAOqoG5T3rjJL7/M6bo5AU0Jz40s0KK6kwphB8SW4q3QjfwE8+3lWEIUvASNTR7sVsxCUtD9/lPW5lSd6O6uOSh1WdMkjGNOVXjFyexeTUVlj7yf7MKcjG5ebCcG8jzaPI3JLfU4E/hRmm5JkZjqu0CWpOhibQR+C8js4mKcz4Tm63LuMJM1tH6q82Q7ryR/MlPPTHL3V2jyJVybSiPcrNtA0NAzckBp5Hjj8qdilGOPfv7CU5OUsjMWhojifNbZtX86Z43Kwu4i3gN/KdgtB5Bu2t+cPnsBxoaefIK97eV5P4Bc/aRL9D/vwrYmfa0E42c2cR9ZSMPO47OWvtqcr37ZXDXv+BtHbuAS9Nityo6FgB253x/h5AOfRb6O7SuDdygR21uplXK/Ot4ClR2uHHSrkBnHWa6x47V0kJeiW+ftHJHKZcyW4yO0Dq7hT2Oi4SLs0m4XJh2Db/ppEaG0Ex2lD1G8/WVnXwFRLhSbl79/2JTkujGV4taGGI0R9ZVMS0FSVA+iFHUJA7AcVwAwkdWNK6SHlSZDj7it5xxRUo1zryl90rZN+QvZY5MJJ8VDKdoYzSEoQh9mQlKRgAFABwO9Jobo3vTKWL4C8d1i6RvNiv9l1JJTnvyfZQZIZcjvLZeRurbJSoU3+Ix7yn5NGmpi0zn38qlretVzS1b5kZyS02readbUUOxj+0lY5Vta9n5ExsyH0ONMdicrX2JH5mnM2LdRHMeFbnI0XpS3gqX9o9PdWNMbK++skVwku81sRN0s8CXcEonSDdH0HdQWm22FHtccAyo+wVwkWe3xxwX4d1h56UTlKHsUMGt2mdya03LBZTxEhZWnGE51/OnnEXdb2lKlqLa3sjJ0CezwFMfH6hrxYDOf6DG1W6LbFcW2C2S5A1Qq5sFLiT0YXkp9wrE5x4NiZtdHm3J8LwzEQAmEjtJTkEfa99O0R25kmW8FojxWyVlQRnCc6YHSa1cD0FxAgy1LQ6kKQUDG8D0FPXW9f4nYvzFn/ACHE0tzu7d56GG/ONorPYo5SOGxBaS6sDqydPYBTGRKt8plbEvbS7OtuDCwuJ9Godo3cEUlohqlF6VADMxJ1kxDwXUntGqVeIp0/Nv6wDab5Fe6mZsVttzuzjdUfZTteroteE8P7fsXjYVjtbsfb2WFTNn7tHuLI/WIThLjfbunmKAnWlsqKVjBq/JM64rPD2gsVmkk8kvoMZZ+y5gpJ7qHNpdmLDOZK40edY5fPclpL0Zz/AGiclPedOytLKX1juM13J7SZVtrabensoeWENhW8pRONBrW12mKnz3ZBzgnCc9CRyFdJ9tfiuFBSFAHA3VbwPaCNCKYYJVgjXlilsPJuknLiMHWurDCnjhPt6qeW61vSnkpQConkBVrbK7Ju2yN50LRDU9jPnl6VuMtfYaGp7zrWka5S3KysjH6g5sfsxY3GDIvd183ORuNNtcQ5616Yx2VZ0K43BxHBtm0lpvbO7umJOZS2oj9kbuB7RTfzvaRzS1XGNLOdRGtaUsJ/2iyBj21pcIfn7KE7SzYG+n6tsiJLv3itE+AraUqqlmTS9/QUnY31Nd+DAn7zK5GyN0UMlrIXEe8OWPAV1Spy9Fz5W2WgSlJGE3JKzFS54n0seJrDT8aGcWy3toWhOOO+S86B9pWcUpAlvyGUTHXCp4ApK1ZBSemkrfxOtbVrLMeYiPc2etyHCX57raOiNBcWsDvWs/lW0ey2XipTHt0t53OUKVMUFA9fogYqZegxCZkaOHhIiNle84oEOAEA6Y056a05t8mKi0JU+FBzeVHLqDhTaFa5x00tLX6mTw5YQcG+5HtxEXdSYr9+u6IgGTBU8CXD1BzQkd9YnSdxoW6LFTBhsn0Y6Rg561HpNNnWQh9TbTofAOims6jrqXZiTpjaUToD7iAPQfCfTR/zCsJ6i++PLk/+hmUsog6VPrla5VtcAfRlojKVgHB+HdTHA6DzpKUZReGYSTjsy1LjAj3GKuNLa32ldGcEdoPQaG37Nd4bqVMtw7u23+rMpRaeSOgFWCFeOKMaxivQp+TOzKCl1Klumz21l1nKekN3Ub2gQiSyhCR1DC/yqd2b2Uv8FCg5dFxEq54eMheO9QCR4A0e4pVu9RJx4Ul9jKOnipcWQUmRr6ygplxIV8jjoH0D/hn0T7RUKtFkee4aZMizSzpwJ7ZbyT0AnQ+CjViEZ6MiuMqIxLbLUplD7Z5ocSFD2GlZwrs8cS0qVIA/kyfbW3UPwxKiOgb5ZUTnHI5Go9lMoL0ZN184eQhlpBKw1zGQNB7aLzsu1GVvWaXJtx/u217zX+A6DwqPnxLgjIulpZuKOmRBO46O0oPPwNLy0XTgl09ReVLRD3J5g25lbTO47LcU8sFW8QBoPA5zUdDjOS30stkbxBUVK5JA5k0/EK1z3eDb7kGZWv6JNSWnB2YOM++tm4Nws76nH4Ti2Skoc3NQUnnqOVJWU2qeZowlCTllrY4uceJHSqNNbfjLJSQBkZ6ilVcFFhJAet/CKhvfQLUyFZ6cDQ+yus+VHlNMMR2+EEeiXFkbxHbjqrW8vNvT3FMqCmkANoPWkCoV86t4SKy2Wz2IuZZrNOSQ6Zic9aGl/kDUSNhbAF7xmzDnqjJGP9+jGClDVsU8YiJC1yEtgKQTpjXl312TCYaus9CGuMI7RW22rpVpp24yfZTXxuolhtr7F4uaWzIe3QrXbUhERyacD6vDaB8QCffTnzqOlQcZgtqWOT0kqfUPFWlOpSUBu3zeChl51RK2wMAgEYOOjP5VIXYQ1RbmGVJadCm18MnAJz6w7waq9RfLPewTiTy8kc43cp8cOPPgN4JbacdCN8D9lPVW1ohx5DDrjiUuOtrAKFu7iEg9JNbxLhDCYzr4XxmE7m7wwoODORjPI9FKLCuUlySuNELTMje3i6N1KUk56eql8cTT6/qQksprcxutW68yWHEqbiOgt+mD6p5EdYzXC5KaEWHHQ+h+QzvAuN5ICScpGemuyGYG+lh64P3OS1oI1vSXdzsKhonxIqagWy7LH6LCiWls/Xd+neI/4QfE0zDSWyW+yLquUtkRgavEuMvjJajtKTh2Q8A3vJ7SdTTeOxbSrhxUzL2+PqwW8NZ7XSd330Vs7KwlOJduS3ri8k5CpS95IPYj1R7Km22kNBKG0hKEjASkYApmOmqju+8zeOn9QYh2i8Ot4/RLM0fqRU8Z3xWoYHgD31B7R7KbSTXeJ54uWAMAsSTHVjtQcpPtFWRilTVdrr8KRo6ItYKrslj2ptzqkqjTpMdYwtiXIZKFeO+ojvAohj2K+Jbw23Zoif7otLfI71nGfZRliliosmpvLiskLTxR/9k=';

  const handleLogout = () => {
    localStorage.removeItem('icamsToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    setIsMobileMenuOpen(false);
    setIsDesktopMenuOpen(false);
    window.location.href = '/login';
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
    setIsDesktopMenuOpen(false);
  };

  return (
    <>
      <nav className="nav-bar">
        <div className="brand">
          <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }} onClick={handleLinkClick}>
            <img src={logoSrc} alt="Siaya County Assembly Logo" style={{ height: '60px', width: 'auto', marginRight: '12px', objectFit: 'contain' }} />
          </Link>
        </div>
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          style={{ display: 'none' }}
        >
          ☰
        </button>
        <div className="nav-actions">
          <button
            className="desktop-menu-toggle"
            type="button"
            onClick={() => setIsDesktopMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            Menu ▾
          </button>

          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            {isLoggedIn ? (
              <>
                {allowedLinks.map(link => (
                  <Link key={link.to} to={link.to} onClick={handleLinkClick}>{link.label}</Link>
                ))}
                {userRole === 'Super Admin' && (
                  <Link to="/register" onClick={handleLinkClick}>Register</Link>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>👤 {userName}</span>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" onClick={handleLinkClick}>Login</Link>
              </>
            )}
          </div>

          <div className={`desktop-dropdown ${isDesktopMenuOpen ? 'open' : ''}`}>
            {isLoggedIn ? (
              <>
                {allowedLinks.map(link => (
                  <Link key={link.to} to={link.to} onClick={handleLinkClick}>{link.label}</Link>
                ))}
                {userRole === 'Super Admin' && (
                  <Link to="/register" onClick={handleLinkClick}>Register</Link>
                )}
                <button type="button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={handleLinkClick}>Login</Link>
            )}
          </div>
        </div>
      </nav>
      <style>{`
        @media screen and (min-width: 769px) {
          .nav-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            position: relative;
          }

          .desktop-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 0.55rem 0.9rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: var(--shadow);
          }

          .desktop-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            min-width: 260px;
            max-height: 80vh;
            overflow-y: auto;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            box-shadow: var(--shadow-hover);
            flex-direction: column;
            padding: 0.5rem;
            z-index: 120;
          }

          .desktop-dropdown.open {
            display: flex;
          }

          .desktop-dropdown a,
          .desktop-dropdown button {
            width: 100%;
            text-align: left;
            padding: 0.65rem 0.75rem;
            border-radius: 10px;
            color: var(--text-primary);
            text-decoration: none;
            background: transparent;
            border: none;
            cursor: pointer;
            font-weight: 500;
          }

          .desktop-dropdown a:hover,
          .desktop-dropdown button:hover {
            background: rgba(178, 34, 52, 0.08);
          }

          .nav-links {
            display: none;
          }
        }

        @media screen and (max-width: 768px) {
          .nav-actions {
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }

          .desktop-menu-toggle,
          .desktop-dropdown {
            display: none;
          }

          .mobile-menu-toggle {
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-primary);
            padding: 0.5rem;
            order: 3;
          }

          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            flex-direction: row;
            flex-wrap: wrap;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding: 0;
          }

          .nav-links.mobile-open {
            max-height: 80vh;
            overflow-y: auto;
            padding: 1rem;
          }

          .nav-links a,
          .nav-links button {
            width: calc(50% - 0.5rem);
            text-align: center;
            margin: 0.25rem;
            box-sizing: border-box;
          }

          .nav-links a {
            display: block;
            padding: 0.75rem 0.5rem;
            border-radius: 6px;
            transition: background 0.2s;
          }

          .nav-links a:hover {
            background: rgba(178, 34, 52, 0.08);
          }

          .nav-links button {
            padding: 0.75rem 1rem;
          }

          .nav-bar {
            flex-wrap: wrap;
            position: relative;
          }

          .nav-links > div {
            width: 100% !important;
            justify-content: center !important;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}
