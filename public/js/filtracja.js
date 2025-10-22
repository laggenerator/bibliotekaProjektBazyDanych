document.addEventListener('DOMContentLoaded', function() {
    const filtrInput = document.getElementById('filtr-ksiazki');
    const listaKsiazek = document.getElementById('lista-ksiazek');
    const ksiazkaItems = document.querySelectorAll('.ksiazka-lista-item');
    const filtrInfo = document.getElementById('filtr-info');
    
    filtrInput.addEventListener('input', function() {
        const filtr = this.value.toLowerCase().trim();
        let widoczneKsiazki = 0;
        
        if (filtr === '') {
            ksiazkaItems.forEach(function(ksiazka) {
                ksiazka.style.display = 'flex';
            });
            filtrInfo.textContent = '';
            return;
        }
        
        const slowa = filtr.split(/\s+/).filter(slowo => slowo.length > 0);
        
        ksiazkaItems.forEach(function(ksiazka) {
            const tytul = ksiazka.getAttribute('data-tytul');
            const autor = ksiazka.getAttribute('data-autor');
            const kategorie = ksiazka.getAttribute('data-kategorie');
            const isbn = ksiazka.getAttribute('data-isbn');
            
            const wszystkieDane = `${tytul} ${autor} ${kategorie} ${isbn}`;
            
            const pasuje = slowa.every(slowo => wszystkieDane.includes(slowo));
            
            if (pasuje) {
                ksiazka.style.display = 'flex';
                widoczneKsiazki++;
            } else {
                ksiazka.style.display = 'none';
            }
        });
        
        filtrInfo.textContent = `Znaleziono ${widoczneKsiazki} z ${ksiazkaItems.length} książek`;
        filtrInfo.className = widoczneKsiazki === 0 ? 'filtr-info brak-wynikow' : 'filtr-info';
    });
    
    filtrInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            this.value = '';
            this.dispatchEvent(new Event('input'));
        }
    });
});