// TO SAMO CO filtracja.js po prostu inne nazwy dostosowane do uzytkownika
document.addEventListener('DOMContentLoaded', function() {
    const filtrInput = document.getElementById('filtr-ksiazki');
    const listaUzytkownikow = document.getElementById('ksiazki-lista');
    const uzytkownikItems = document.querySelectorAll('.uzytkownik-lista-item');
    const filtrInfo = document.getElementById('filtr-info');
    
    filtrInput.addEventListener('input', function() {
        const filtr = this.value.toLowerCase().trim();
        let widoczniUzytkownicy = 0;
        
        if (filtr === '') {
            uzytkownikItems.forEach(function(uzytkownik) {
                uzytkownik.style.display = 'flex';
            });
            filtrInfo.textContent = '';
            return;
        }
        
        const slowa = filtr.split(/\s+/).filter(slowo => slowo.length > 0);
        
        uzytkownikItems.forEach(function(uzytkownik) {
            const nazwa = uzytkownik.getAttribute('data-nazwa');
            const email = uzytkownik.getAttribute('data-email');
            const numerKarty = uzytkownik.getAttribute('data-numer-karty');
            const rola = uzytkownik.getAttribute('data-rola');
            
            const wszystkieDane = `${nazwa} ${email} ${numerKarty} ${rola}`;
            
            const pasuje = slowa.every(slowo => wszystkieDane.includes(slowo));
            
            if (pasuje) {
                uzytkownik.style.display = 'flex';
                widoczniUzytkownicy++;
            } else {
                uzytkownik.style.display = 'none';
            }
        });
        
        filtrInfo.textContent = `Znaleziono ${widoczniUzytkownicy} z ${uzytkownikItems.length} użytkowników`;
        filtrInfo.className = widoczniUzytkownicy === 0 ? 'filtr-info brak-wynikow' : 'filtr-info';
    });
    
    filtrInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            this.dispatchEvent(new Event('input'));
            this.focus();
        }
    });
    
    filtrInput.focus();
});