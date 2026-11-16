 // Configurar worker de PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // Configuración de tus carpetas y rangos máximos a escanear
        const CONFIG = [
            {
                containerId: 'menu-acag',
                titleId: 'title-acag',
                label: '📂 Act. Autogestivas',
                folder: 'Act_Autogestivas',
                prefix: 'ACAG_',
                maxScan: 15
            },
            {
                containerId: 'menu-acpt',
                titleId: 'title-acpt',
                label: '📁 Act. Portafolio',
                folder: 'Act_Portafolio',
                prefix: 'ACPT_',
                maxScan: 35
            }
        ];

        let firstPdfLoaded = false;

        // Extrae el título de los metadatos del PDF o de la primera línea de texto de la hoja 1
        async function extractPdfTitle(url, fallbackName) {
            try {
                const loadingTask = pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;

                const meta = await pdf.getMetadata().catch(() => null);
                if (meta && meta.info && meta.info.Title && meta.info.Title.trim().length > 2) {
                    const cleanMeta = meta.info.Title.trim();
                    if (!cleanMeta.toLowerCase().includes('microsoft word') && !cleanMeta.endsWith('.tex')) {
                        return cleanMeta;
                    }
                }

                const page = await pdf.getPage(1);
                const textContent = await page.getTextContent();
                const lines = textContent.items
                    .map(item => item.str.trim())
                    .filter(str => str.length > 3);

                if (lines.length > 0) {
                    let titleCandidate = lines.slice(0, 2).join(' - ');
                    if (titleCandidate.length > 55) {
                        titleCandidate = titleCandidate.substring(0, 52) + '...';
                    }
                    return titleCandidate;
                }
            } catch (e) {
                console.warn(`No se pudo extraer texto de ${url}:`, e);
            }
            return fallbackName;
        }

        // Verifica si cada archivo existe y renderiza ÚNICAMENTE los disponibles
        async function buildDynamicMenu(section) {
            const container = document.getElementById(section.containerId);
            const titleEl = document.getElementById(section.titleId);
            container.innerHTML = '';

            const promises = [];

            for (let i = 1; i <= section.maxScan; i++) {
                const fileName = `${section.prefix}${i}.pdf`;
                const filePath = `${section.folder}/${fileName}`;

                const itemPromise = (async () => {
                    try {
                        const response = await fetch(filePath, { method: 'HEAD' });

                        if (response.ok) {
                            const extractedTitle = await extractPdfTitle(filePath, `Actividad ${i}`);
                            const link = document.createElement('a');
                            link.href = `${filePath}#view=FitH`;
                            link.target = 'visor';
                            link.innerHTML = `📄 <strong>${section.prefix}${i}:</strong> ${extractedTitle}`;
                            link.onclick = function () { onTopicSelect(this); };

                            return { exists: true, element: link, path: `${filePath}#view=FitH` };
                        }
                    } catch (err) {
                        // Archivo no encontrado, se ignora silenciosamente
                    }
                    return { exists: false };
                })();

                promises.push(itemPromise);
            }

            const results = await Promise.all(promises);
            const foundItems = results.filter(res => res.exists);

            titleEl.textContent = `${section.label} (${foundItems.length})`;

            if (foundItems.length === 0) {
                const emptyMsg = document.createElement('span');
                emptyMsg.className = 'info-msg';
                emptyMsg.textContent = 'Sin archivos cargados aún';
                container.appendChild(emptyMsg);
                return;
            }

            foundItems.forEach(res => {
                container.appendChild(res.element);
                if (!firstPdfLoaded) {
                    firstPdfLoaded = true;
                    document.getElementById('visor').src = res.path;
                    res.element.classList.add('active-link');
                }
            });
        }

        window.addEventListener('DOMContentLoaded', () => {
            CONFIG.forEach(section => buildDynamicMenu(section));
        });

        function toggleMenu(menuId) {
            const submenu = document.getElementById(menuId);
            const isVisible = submenu.classList.contains('active');
            document.querySelectorAll('.submenu').forEach(el => el.classList.remove('active'));
            if (!isVisible) submenu.classList.add('active');
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('overlay').classList.toggle('active');
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('active');
        }

        function onTopicSelect(linkElement) {
            document.querySelectorAll('.submenu a').forEach(a => a.classList.remove('active-link'));
            linkElement.classList.add('active-link');
            if (window.innerWidth <= 768) closeSidebar();
        }