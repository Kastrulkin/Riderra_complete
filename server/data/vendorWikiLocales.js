const VENDOR_LANGUAGES = ['ru', 'en', 'es', 'de', 'fr', 'el', 'th', 'ar', 'ha']

const VENDOR_LANGUAGE_NAMES = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  el: 'Ελληνικά',
  th: 'ไทย',
  ar: 'العربية',
  ha: 'Hausa'
}

const VENDOR_WIKI_UI = {
  en: {
    pageTitle: 'Riderra Vendor Wiki | Public partner guide', description: 'Public operating guide for Riderra transport partners, fleet managers and drivers.',
    partnerGuide: 'Public partner guide', title: 'Riderra Vendor Wiki', hero: 'Operating guidance for transport companies, fleet managers and drivers working with Riderra.',
    publicAccess: 'Public access', publicAccessText: 'No Riderra account is required to read or share this guide.', lastUpdated: 'Last updated',
    partners: 'For partners', apply: 'Become a fleet partner', login: 'Driver login', language: 'Language', navigation: 'Wiki navigation',
    search: 'Search the guide', searchPlaceholder: 'Try “airport pickup”', helpTitle: 'Need help with a live trip?', helpText: 'Contact Riderra dispatch through the channel shown in the booking. General questions:',
    newTitle: 'New to Riderra?', newText: 'Start with the vendor role, requirements and onboarding checklist.', start: 'Start onboarding',
    empty: 'No articles match your search. Try a shorter term or contact Riderra.', legal: 'This public guide explains Riderra’s standard operating process. The signed vendor agreement, agreed rate sheet and instructions in a specific booking take precedence if they differ from this page.',
    rowClass: 'Class', rowCapacity: 'Typical capacity', rowExamples: 'Examples', rowStatus: 'Status', rowMeaning: 'Meaning', rowWhen: 'When to use it'
  },
  ru: {
    pageTitle: 'Vendor Wiki Riderra | Публичное руководство', description: 'Публичное руководство для транспортных партнёров, диспетчеров и водителей Riderra.',
    partnerGuide: 'Публичное руководство для партнёров', title: 'Vendor Wiki Riderra', hero: 'Правила работы для транспортных компаний, диспетчеров и водителей Riderra.',
    publicAccess: 'Открытый доступ', publicAccessText: 'Для чтения и передачи ссылки аккаунт Riderra не нужен.', lastUpdated: 'Обновлено',
    partners: 'Партнёрам', apply: 'Стать перевозчиком', login: 'Вход для водителя', language: 'Язык', navigation: 'Навигация по Wiki',
    search: 'Поиск по руководству', searchPlaceholder: 'Например, «встреча в аэропорту»', helpTitle: 'Нужна помощь по текущей поездке?', helpText: 'Свяжитесь с диспетчером Riderra по каналу из заказа. Общие вопросы:',
    newTitle: 'Впервые в Riderra?', newText: 'Начните с роли поставщика, требований и чек-листа подключения.', start: 'Начать подключение',
    empty: 'Ничего не найдено. Сократите запрос или свяжитесь с Riderra.', legal: 'Это руководство описывает стандартные процессы Riderra. При расхождении приоритет имеют договор, согласованный прайс и инструкции в заказе.',
    rowClass: 'Класс', rowCapacity: 'Типичная вместимость', rowExamples: 'Примеры', rowStatus: 'Статус', rowMeaning: 'Значение', rowWhen: 'Когда использовать'
  }
}

const GENERIC_UI = {
  es: ['Guía pública para socios', 'Guía operativa para empresas de transporte, gestores de flota y conductores de Riderra.', 'Acceso público', 'No se necesita una cuenta de Riderra para leer o compartir esta guía.', 'Para socios', 'Ser socio de flota', 'Acceso del conductor', 'Buscar en la guía', 'Por ejemplo, «recogida en el aeropuerto»', '¿Nuevo en Riderra?', 'Empezar la incorporación'],
  de: ['Öffentlicher Partnerleitfaden', 'Betriebsanleitung für Transportunternehmen, Flottenmanager und Fahrer von Riderra.', 'Öffentlicher Zugang', 'Zum Lesen oder Teilen dieses Leitfadens ist kein Riderra-Konto erforderlich.', 'Für Partner', 'Flottenpartner werden', 'Fahrer-Login', 'Leitfaden durchsuchen', 'Zum Beispiel „Abholung am Flughafen“', 'Neu bei Riderra?', 'Onboarding starten'],
  fr: ['Guide public des partenaires', 'Guide opérationnel pour les entreprises de transport, les gestionnaires de flotte et les chauffeurs Riderra.', 'Accès public', 'Aucun compte Riderra n’est nécessaire pour lire ou partager ce guide.', 'Pour les partenaires', 'Devenir partenaire de flotte', 'Connexion chauffeur', 'Rechercher dans le guide', 'Par exemple « prise en charge à l’aéroport »', 'Nouveau chez Riderra ?', 'Commencer l’intégration'],
  el: ['Δημόσιος οδηγός συνεργατών', 'Οδηγίες λειτουργίας για εταιρείες μεταφορών, διαχειριστές στόλου και οδηγούς Riderra.', 'Δημόσια πρόσβαση', 'Δεν απαιτείται λογαριασμός Riderra για ανάγνωση ή κοινοποίηση.', 'Για συνεργάτες', 'Γίνετε συνεργάτης στόλου', 'Σύνδεση οδηγού', 'Αναζήτηση στον οδηγό', 'Π.χ. «παραλαβή από αεροδρόμιο»', 'Νέος στη Riderra;', 'Έναρξη ένταξης'],
  th: ['คู่มือพันธมิตรสาธารณะ', 'คู่มือการทำงานสำหรับบริษัทขนส่ง ผู้จัดการรถ และพนักงานขับรถ Riderra', 'เข้าถึงได้สาธารณะ', 'ไม่ต้องมีบัญชี Riderra เพื่ออ่านหรือแชร์คู่มือนี้', 'สำหรับพันธมิตร', 'สมัครเป็นพันธมิตรรถ', 'เข้าสู่ระบบพนักงานขับรถ', 'ค้นหาในคู่มือ', 'เช่น “รับที่สนามบิน”', 'เพิ่งเริ่มใช้ Riderra?', 'เริ่มการเข้าร่วม'],
  ar: ['دليل الشركاء العام', 'إرشادات التشغيل لشركات النقل ومديري الأسطول والسائقين العاملين مع Riderra.', 'وصول عام', 'لا يلزم حساب Riderra لقراءة هذا الدليل أو مشاركته.', 'للشركاء', 'التسجيل كشريك أسطول', 'دخول السائق', 'البحث في الدليل', 'مثل «الاستقبال في المطار»', 'جديد في Riderra؟', 'بدء الانضمام'],
  ha: ['Jagorar abokan hulɗa ta jama’a', 'Jagorar aiki ga kamfanonin sufuri, masu kula da motocin aiki da direbobin Riderra.', 'Buɗaɗɗen damar jama’a', 'Ba a buƙatar asusun Riderra don karantawa ko raba wannan jagorar.', 'Ga abokan hulɗa', 'Kasance abokin hulɗar motoci', 'Shigar direba', 'Bincika jagorar', 'Misali, “dauka a filin jirgin sama”', 'Sabon shiga Riderra?', 'Fara rajista']
}

Object.entries(GENERIC_UI).forEach(([lang, values]) => {
  VENDOR_WIKI_UI[lang] = {
    ...VENDOR_WIKI_UI.en,
    pageTitle: `Riderra Vendor Wiki | ${values[0]}`,
    description: values[1], partnerGuide: values[0], hero: values[1], publicAccess: values[2], publicAccessText: values[3],
    partners: values[4], apply: values[5], login: values[6], search: values[7], searchPlaceholder: values[8], newTitle: values[9], start: values[10]
  }
})

const VENDOR_WIKI_UI_EXTRA = {
  es: ['Actualizado', 'Idioma', 'Navegación de la Wiki', '¿Necesita ayuda con un traslado en curso?', 'Contacte con el equipo operativo de Riderra por el canal indicado en la reserva. Consultas generales:', 'Empiece por la función del proveedor, los requisitos y la lista de incorporación.', 'No hay artículos que coincidan. Pruebe un término más corto o contacte con Riderra.', 'Esta guía explica el proceso operativo habitual de Riderra. En caso de diferencia, prevalecen el contrato firmado, la tarifa acordada y las instrucciones de la reserva.'],
  de: ['Aktualisiert', 'Sprache', 'Wiki-Navigation', 'Brauchen Sie Hilfe bei einer laufenden Fahrt?', 'Kontaktieren Sie Riderra über den in der Buchung genannten Kanal. Allgemeine Fragen:', 'Beginnen Sie mit Anbieterrolle, Anforderungen und Onboarding-Checkliste.', 'Keine passenden Artikel gefunden. Versuchen Sie einen kürzeren Begriff oder kontaktieren Sie Riderra.', 'Dieser Leitfaden beschreibt den Standardprozess von Riderra. Bei Abweichungen haben der unterzeichnete Vertrag, das vereinbarte Preisblatt und die Buchungsanweisungen Vorrang.'],
  fr: ['Mis à jour', 'Langue', 'Navigation du Wiki', 'Besoin d’aide pour une course en cours ?', 'Contactez l’exploitation Riderra par le canal indiqué dans la réservation. Questions générales :', 'Commencez par le rôle du fournisseur, les exigences et la liste d’intégration.', 'Aucun article ne correspond. Essayez un terme plus court ou contactez Riderra.', 'Ce guide décrit le processus opérationnel standard de Riderra. En cas de différence, le contrat signé, la grille tarifaire convenue et les instructions de la réservation prévalent.'],
  el: ['Ενημερώθηκε', 'Γλώσσα', 'Πλοήγηση Wiki', 'Χρειάζεστε βοήθεια για ενεργή διαδρομή;', 'Επικοινωνήστε με τη Riderra μέσω του καναλιού της κράτησης. Γενικές ερωτήσεις:', 'Ξεκινήστε με τον ρόλο, τις απαιτήσεις και τη λίστα ένταξης.', 'Δεν βρέθηκαν σχετικά άρθρα. Δοκιμάστε μικρότερο όρο ή επικοινωνήστε με τη Riderra.', 'Ο οδηγός περιγράφει την τυπική διαδικασία Riderra. Σε διαφορά, υπερισχύουν η σύμβαση, οι συμφωνημένες τιμές και οι οδηγίες κράτησης.'],
  th: ['อัปเดตเมื่อ', 'ภาษา', 'การนำทาง Wiki', 'ต้องการความช่วยเหลือกับงานที่กำลังดำเนินการ?', 'ติดต่อฝ่ายปฏิบัติการ Riderra ผ่านช่องทางในการจอง คำถามทั่วไป:', 'เริ่มจากบทบาท ข้อกำหนด และรายการเข้าร่วม', 'ไม่พบบทความที่ตรงกัน ลองคำค้นที่สั้นลงหรือติดต่อ Riderra', 'คู่มือนี้อธิบายกระบวนการมาตรฐานของ Riderra หากแตกต่าง ให้ยึดสัญญา ราคที่ตกลง และคำแนะนำในการจองเป็นหลัก'],
  ar: ['تم التحديث', 'اللغة', 'التنقل في Wiki', 'هل تحتاج مساعدة في رحلة جارية؟', 'تواصل مع Riderra عبر القناة المذكورة في الحجز. للأسئلة العامة:', 'ابدأ بدور المورد والمتطلبات وقائمة الانضمام.', 'لا توجد مقالات مطابقة. جرب كلمة أقصر أو تواصل مع Riderra.', 'يشرح هذا الدليل عملية Riderra القياسية. عند الاختلاف، تسود الاتفاقية الموقعة والأسعار المتفق عليها وتعليمات الحجز.'],
  ha: ['An sabunta', 'Harshe', 'Kewayawa a Wiki', 'Ana buƙatar taimako da tafiya mai gudana?', 'Tuntuɓi Riderra ta hanyar da ke cikin odar. Tambayoyi na gaba ɗaya:', 'Fara da matsayin mai ba da sabis, buƙatu da jerin rajista.', 'Ba a sami bayani ba. Gwada gajeriyar kalma ko tuntuɓi Riderra.', 'Wannan jagora yana bayyana tsarin aikin Riderra. Idan akwai bambanci, yarjejeniyar da aka sanya wa hannu, farashin da aka amince da shi da umarnin oda su ne gaba.']
}

Object.entries(VENDOR_WIKI_UI_EXTRA).forEach(([lang, values]) => {
  Object.assign(VENDOR_WIKI_UI[lang], {
    lastUpdated: values[0], language: values[1], navigation: values[2], helpTitle: values[3], helpText: values[4],
    newText: values[5], empty: values[6], legal: values[7]
  })
})

const LOCALIZED_GUIDES = {
  ru: [
    ['Начало работы', 'Роль и требования', 'Поставщик обеспечивает лицензированный и застрахованный транспорт, обученных водителей и круглосуточный оперативный контакт. До первой поездки согласуйте зоны, классы машин, вместимость, нетто-цены, включённые сборы и условия оплаты.'],
    ['Аккаунт и автопарк', 'Регистрация и вместимость', 'Подайте заявку на сайте, указав компанию, контакты, регион, машины и тарифы. Назначайте машину по классу, числу пассажиров и реальному объёму багажа; замена на класс ниже без согласования недопустима.'],
    ['EasyTaxi / ETO', 'Назначение заказов', 'Riderra передаёт заказ в аккаунт Fleet Operator. Диспетчер проверяет дату, время, маршрут, класс, пассажиров, багаж и инструкции, затем назначает водителя. Водитель принимает заказ в ETO Driver, включает уведомления и геолокацию и точно отмечает статусы En Route, Arrived, On board и Completed.'],
    ['Заказы', 'Выполнение поездки', 'Перепроверьте заказ не позднее чем за 24 часа. Следите за рейсом, соблюдайте указанную процедуру встречи и время ожидания. О задержке, замене машины или водителя, no-show или изменении маршрута сообщайте Riderra немедленно.'],
    ['Доказательства и связь', 'Подтверждение поездки', 'При задержке или отсутствии пассажира сохраните GPS-скриншот со временем, попытки звонка или сообщения, статус рейса и чеки. Передавайте их только по одобренным каналам и не публикуйте данные пассажира.'],
    ['Оплата', 'Тарифы и счета', 'Нетто-тариф и все включённые расходы согласовываются до подтверждения. Доплаты требуют одобрения. Riderra платит из Эстонии на банковский счёт поставщика; форма W-9 для США не нужна. Валюта, счёт, банковские комиссии и сроки согласуются заранее.']
  ]
}

const GUIDE_COPY = {
  es: [
    ['Primeros pasos', 'Función y requisitos', 'El proveedor debe ofrecer transporte autorizado y asegurado, conductores preparados y un contacto operativo disponible. Antes del primer viaje, acuerde las zonas, clases de vehículos, capacidades, tarifas netas, conceptos incluidos y condiciones de pago.'],
    ['Cuenta y flota', 'Registro y capacidad', 'Solicite el alta con los datos de la empresa, contactos, región, vehículos y tarifas. Asigne siempre una clase y capacidad adecuadas para los pasajeros y su equipaje; no sustituya por una clase inferior sin autorización.'],
    ['EasyTaxi / ETO', 'Asignación de servicios', 'Riderra envía el servicio a la cuenta Fleet Operator. Revise todos los datos, asigne conductor y vehículo y confirme que el conductor lo acepta en ETO Driver. Active notificaciones y ubicación y use los estados En Route, Arrived, On board y Completed en el momento real.'],
    ['Servicios', 'Ejecución del traslado', 'Revise el servicio al menos 24 horas antes, controle el vuelo y siga el procedimiento de recogida y espera indicado. Comunique inmediatamente retrasos, cambios de conductor o vehículo, no-shows y cambios de ruta.'],
    ['Pruebas y comunicación', 'Documentación del servicio', 'Cuando haya un retraso o no aparezca el pasajero, conserve ubicación con hora, llamadas o mensajes, estado del vuelo y recibos. Comparta las pruebas solo por canales autorizados y proteja los datos del pasajero.'],
    ['Pagos', 'Tarifas y facturas', 'La tarifa neta y los conceptos incluidos se acuerdan antes de confirmar; cualquier extra necesita aprobación. Riderra paga desde Estonia a la cuenta bancaria del proveedor y no exige el formulario W-9 de EE. UU. Acuerde previamente moneda, factura, comisiones y plazo.']
  ],
  de: [
    ['Erste Schritte', 'Rolle und Anforderungen', 'Der Anbieter stellt lizenzierte und versicherte Beförderung, geschulte Fahrer und einen erreichbaren Betriebskontakt bereit. Vor der ersten Fahrt werden Gebiete, Fahrzeugklassen, Kapazitäten, Nettopreise, Inklusivleistungen und Zahlungsbedingungen vereinbart.'],
    ['Konto und Fuhrpark', 'Registrierung und Kapazität', 'Bewerben Sie sich mit Firmen-, Kontakt-, Regions-, Fahrzeug- und Preisdaten. Weisen Sie immer eine passende Klasse mit genügend Sitz- und Gepäckraum zu; eine niedrigere Klasse darf nicht ohne Freigabe eingesetzt werden.'],
    ['EasyTaxi / ETO', 'Aufträge zuweisen', 'Riderra sendet den Auftrag an das Fleet-Operator-Konto. Prüfen Sie alle Angaben, weisen Sie Fahrer und Fahrzeug zu und bestätigen Sie die Annahme in ETO Driver. Benachrichtigungen und Standort müssen aktiv sein; En Route, Arrived, On board und Completed werden zum tatsächlichen Zeitpunkt gesetzt.'],
    ['Aufträge', 'Transfer durchführen', 'Prüfen Sie den Auftrag spätestens 24 Stunden vorher, verfolgen Sie den Flug und beachten Sie Abhol- und Warteanweisungen. Melden Sie Verspätungen, Fahrer- oder Fahrzeugwechsel, No-shows und Routenänderungen sofort.'],
    ['Nachweise und Kommunikation', 'Fahrt dokumentieren', 'Bei Verspätung oder fehlendem Fahrgast sichern Sie Standort mit Zeitstempel, Anruf- oder Nachrichtenversuche, Flugstatus und Belege. Teilen Sie Nachweise nur über freigegebene Kanäle und schützen Sie Fahrgastdaten.'],
    ['Zahlungen', 'Preise und Rechnungen', 'Nettopreis und Inklusivleistungen werden vor Bestätigung vereinbart; Zuschläge brauchen eine Freigabe. Riderra zahlt aus Estland auf das Bankkonto des Anbieters; ein US-W-9 ist nicht erforderlich. Währung, Rechnung, Gebühren und Frist werden vorab geklärt.']
  ],
  fr: [
    ['Premiers pas', 'Rôle et exigences', 'Le fournisseur assure un transport autorisé et assuré, des chauffeurs formés et un contact opérationnel joignable. Avant le premier trajet, convenez des zones, classes, capacités, tarifs nets, prestations incluses et conditions de paiement.'],
    ['Compte et flotte', 'Inscription et capacité', 'Inscrivez l’entreprise avec ses contacts, sa zone, ses véhicules et ses tarifs. Affectez toujours une classe avec assez de places et de volume pour les bagages ; aucune classe inférieure sans accord.'],
    ['EasyTaxi / ETO', 'Affectation des courses', 'Riderra envoie la course au compte Fleet Operator. Vérifiez les informations, affectez chauffeur et véhicule, puis confirmez l’acceptation dans ETO Driver. Activez notifications et localisation et utilisez En Route, Arrived, On board et Completed au moment réel.'],
    ['Courses', 'Réaliser le transfert', 'Revérifiez la course au moins 24 heures avant, suivez le vol et respectez les consignes de prise en charge et d’attente. Signalez immédiatement retard, changement, no-show ou modification d’itinéraire.'],
    ['Preuves et communication', 'Documenter la course', 'En cas de retard ou d’absence du passager, conservez position horodatée, appels ou messages, statut du vol et reçus. Partagez les preuves uniquement par les canaux approuvés et protégez les données du passager.'],
    ['Paiements', 'Tarifs et factures', 'Le tarif net et les inclusions sont convenus avant confirmation ; tout supplément exige un accord. Riderra paie depuis l’Estonie sur le compte bancaire du fournisseur et ne demande pas de W-9 américain. Devise, facture, frais et délai sont fixés à l’avance.']
  ],
  el: [
    ['Έναρξη', 'Ρόλος και απαιτήσεις', 'Ο προμηθευτής παρέχει αδειοδοτημένη και ασφαλισμένη μεταφορά, εκπαιδευμένους οδηγούς και διαθέσιμη επικοινωνία. Πριν την πρώτη διαδρομή συμφωνούνται περιοχές, κατηγορίες, χωρητικότητα, καθαρές τιμές και πληρωμές.'],
    ['Λογαριασμός και στόλος', 'Εγγραφή και χωρητικότητα', 'Υποβάλετε στοιχεία εταιρείας, επαφών, περιοχής, οχημάτων και τιμών. Επιλέγετε πάντα τη σωστή κατηγορία και επαρκή χώρο για επιβάτες και αποσκευές.'],
    ['EasyTaxi / ETO', 'Ανάθεση διαδρομών', 'Η Riderra στέλνει τη διαδρομή στον Fleet Operator. Ελέγξτε όλα τα στοιχεία, αναθέστε οδηγό και όχημα και επιβεβαιώστε την αποδοχή στο ETO Driver. Ενεργοποιήστε ειδοποιήσεις και τοποθεσία και χρησιμοποιήστε τις καταστάσεις στον πραγματικό χρόνο.'],
    ['Διαδρομές', 'Εκτέλεση μεταφοράς', 'Επανελέγξτε τη διαδρομή τουλάχιστον 24 ώρες πριν, παρακολουθήστε την πτήση και τηρήστε τις οδηγίες παραλαβής και αναμονής. Αναφέρετε αμέσως καθυστερήσεις, αλλαγές, no-show και αλλαγές διαδρομής.'],
    ['Αποδείξεις και επικοινωνία', 'Τεκμηρίωση διαδρομής', 'Σε καθυστέρηση ή απουσία επιβάτη, κρατήστε τοποθεσία με ώρα, απόπειρες κλήσης ή μηνύματος, κατάσταση πτήσης και αποδείξεις. Μοιραστείτε τα μόνο μέσω εγκεκριμένων καναλιών και προστατέψτε τα δεδομένα επιβατών.'],
    ['Πληρωμές', 'Τιμές και τιμολόγια', 'Η καθαρή τιμή και όσα περιλαμβάνει συμφωνούνται πριν την επιβεβαίωση. Κάθε προσθήκη χρειάζεται έγκριση. Η Riderra πληρώνει από την Εσθονία στον τραπεζικό λογαριασμό του προμηθευτή και δεν απαιτεί αμερικανικό W-9.']
  ],
  th: [
    ['เริ่มต้น', 'บทบาทและข้อกำหนด', 'ผู้ให้บริการต้องมีใบอนุญาต ประกันภัย พนักงานขับรถที่ได้รับการฝึกอบรม และช่องทางติดต่อที่พร้อมใช้งาน ก่อนงานแรกให้ตกลงพื้นที่ ชั้นรถ ความจุ ราคาสุทธิ และการชำระเงิน'],
    ['บัญชีและกลุ่มรถ', 'การลงทะเบียนและความจุ', 'ส่งข้อมูลบริษัท ผู้ติดต่อ พื้นที่ รถ และราคา ต้องจัดรถที่มีชั้นและพื้นที่เพียงพอสำหรับผู้โดยสารและกระเป๋า ห้ามลดชั้นรถโดยไม่ได้รับอนุมัติ'],
    ['EasyTaxi / ETO', 'การมอบหมายงาน', 'Riderra ส่งงานไปยังบัญชี Fleet Operator ตรวจสอบทุกรายละเอียด มอบหมายพนักงานขับรถและรถ และยืนยันว่าพนักงานขับรถรับงานใน ETO Driver เปิดการแจ้งเตือนและตำแหน่ง และอัปเดตสถานะตามเวลาจริง'],
    ['งานรับส่ง', 'การปฏิบัติงาน', 'ตรวจงานอย่างน้อย 24 ชั่วโมงล่วงหน้า ติดตามเที่ยวบิน และทำตามคำแนะนำการรับและรอ แจ้งความล่าช้า การเปลี่ยนรถหรือคนขับ no-show และการเปลี่ยนเส้นทางให้ Riderra ทราบทันที'],
    ['หลักฐานและการสื่อสาร', 'บันทึกงาน', 'เมื่อล่าช้าหรือไม่พบผู้โดยสาร ให้เก็บตำแหน่งพร้อมเวลา ความพยายามโทรหรือส่งข้อความ สถานะเที่ยวบิน และใบเสร็จ แชร์เฉพาะผ่านช่องทางที่อนุมัติและปกป้องข้อมูลผู้โดยสาร'],
    ['การชำระเงิน', 'ราคาและใบแจ้งหนี้', 'ตกลงราคาสุทธิและรายการที่รวมก่อนยืนยัน ค่าเพิ่มต้องได้รับอนุมัติ Riderra ชำระเงินจากเอสโตเนียเข้าบัญชีธนาคารของผู้ให้บริการ ไม่ต้องใช้แบบฟอร์ม W-9 ของสหรัฐฯ']
  ],
  ar: [
    ['البدء', 'الدور والمتطلبات', 'يوفر المورد نقلاً مرخصاً ومؤمناً وسائقين مدربين وجهة اتصال تشغيلية متاحة. قبل الرحلة الأولى يتم الاتفاق على المناطق وفئات المركبات والسعة والأسعار الصافية والدفع.'],
    ['الحساب والأسطول', 'التسجيل والسعة', 'قدم بيانات الشركة والاتصال والمنطقة والمركبات والأسعار. اختر دائماً فئة وسعة مناسبتين للركاب والأمتعة، ولا تستبدل بفئة أدنى دون موافقة.'],
    ['EasyTaxi / ETO', 'إسناد الرحلات', 'ترسل Riderra الرحلة إلى حساب Fleet Operator. راجع جميع التفاصيل وأسند السائق والمركبة وتأكد من القبول في ETO Driver. فعّل الإشعارات والموقع وحدّث الحالات في وقتها الحقيقي.'],
    ['الرحلات', 'تنفيذ النقل', 'راجع الرحلة قبل 24 ساعة على الأقل، وتابع الرحلة الجوية واتبع تعليمات الاستقبال والانتظار. أبلغ Riderra فوراً عن التأخير أو التغيير أو غياب الراكب أو تغيير المسار.'],
    ['الأدلة والتواصل', 'توثيق الرحلة', 'عند التأخير أو عدم ظهور الراكب، احتفظ بموقع مؤرخ ومحاولات الاتصال أو الرسائل وحالة الرحلة والإيصالات. شارك الأدلة فقط عبر القنوات المعتمدة واحمِ بيانات الراكب.'],
    ['المدفوعات', 'الأسعار والفواتير', 'يتم الاتفاق على السعر الصافي وما يشمله قبل التأكيد، وتحتاج أي إضافة إلى موافقة. تدفع Riderra من إستونيا إلى الحساب المصرفي للمورد، ولا يلزم نموذج W-9 أمريكي.']
  ],
  ha: [
    ['Fara aiki', 'Matsayi da buƙatu', 'Mai ba da sabis yana samar da sufuri mai lasisi da inshora, horarrun direbobi da hanyar tuntuɓar aiki. Kafin tafiya ta farko, a amince da yankuna, nau’in motoci, yawan fasinjoji, farashin net, abubuwan da farashi ya ƙunsa da sharuddan biyan kuɗi.'],
    ['Asusu da motoci', 'Rajista da yawan fasinjoji', 'A aika bayanan kamfani, tuntuɓa, yanki, motoci da farashi. A ko da yaushe a zaɓi motar da ta dace da fasinjoji da kayansu; kar a sauya zuwa aji ƙasa ba tare da izini ba.'],
    ['EasyTaxi / ETO', 'Ba da aikin tafiya', 'Riderra tana aika aiki zuwa asusun Fleet Operator. A duba bayanai, a sanya direba da mota, sannan a tabbatar direban ya karɓa a ETO Driver. A kunna sanarwa da wurin GPS, kuma a sabunta matsayin tafiya a ainihin lokaci.'],
    ['Tafiye-tafiye', 'Gudanar da canja wuri', 'A sake duba tafiya aƙalla awa 24 kafin lokaci, a bibiyi jirgi, kuma a bi umarnin ɗauka da jira. A sanar da Riderra nan da nan game da jinkiri, sauyin direba ko mota, rashin bayyanar fasinja ko sauyin hanya.'],
    ['Shaida da sadarwa', 'Rubuta bayanan tafiya', 'Idan an yi jinkiri ko fasinja bai bayyana ba, a adana hoton wuri mai lokaci, kiran waya ko saƙonni, matsayin jirgi da rasit. A raba shaida ta hanyoyin da aka amince kawai kuma a kare bayanan fasinja.'],
    ['Biyan kuɗi', 'Farashi da takardun kuɗi', 'A amince da farashin net da abin da ya ƙunsa kafin tabbatarwa; ƙarin kuɗi yana buƙatar izini. Riderra tana biya daga Estonia zuwa asusun bankin mai ba da sabis, kuma ba a buƙatar takardar W-9 ta Amurka.']
  ]
}

Object.assign(LOCALIZED_GUIDES, GUIDE_COPY)

const RUSSIAN_GETTING_STARTED_SECTION = {
  id: 'getting-started',
  title: 'Начало работы',
  summary: 'Роль вендора и полный путь заказа: от получения до сверки и оплаты.',
  articles: [
    {
      id: 'getting-started-guide',
      title: 'Роль и требования',
      intro: 'Вендор — операционный партнёр Riderra в своей зоне. Он отвечает не только за машину, но и за назначение подходящего водителя, контроль поездки и своевременную связь.',
      blocks: [
        {
          title: 'Что обеспечивает вендор',
          items: [
            'Лицензированный и застрахованный транспорт, соответствующий местным требованиям.',
            'Обученных водителей и машины нужного класса с достаточным местом для пассажиров и багажа.',
            'Диспетчерский контакт, доступный круглосуточно по текущим поездкам.',
            'Назначение, перепроверку и контроль каждого заказа до корректного завершения.',
            'Поддержку пассажира на подаче и доказательства при задержке, no-show или споре.'
          ]
        },
        {
          title: 'Что согласовать до первой поездки',
          items: [
            'Рабочие города и зоны, классы автомобилей и реальную вместимость с багажом.',
            'Нетто-цены, валюту, налоги, парковку, платные дороги, ожидание и другие включённые расходы.',
            'Процедуру встречи в аэропорту, оперативные контакты и порядок срочной эскалации.',
            'Реквизиты, формат счёта, период сверки и сроки оплаты.',
            'Доступ Fleet Operator и отдельные аккаунты ETO Driver для водителей.'
          ]
        },
        {
          title: 'Главное правило',
          body: 'Вендор остаётся ответственным за заказ с момента его получения до завершения сверки. Передача поездки водителю не передаёт ему всю операционную ответственность: вендор контролирует подтверждение, подачу, статусы, проблемы и документы.'
        }
      ]
    },
    {
      id: 'order-to-payment-workflow',
      title: 'Процесс работы от заявки до оплаты',
      intro: 'Сквозной путь одного заказа. В каждой строке указано, кто и что делает, а также какой результат должен быть виден перед переходом к следующему этапу.',
      blocks: [
        {
          title: 'Жизненный цикл заказа',
          headings: ['Этап', 'Riderra', 'Вендор / диспетчер', 'Водитель', 'Результат'],
          rows: [
            [{ label: '1. Новый заказ', href: '#order-check-and-flight' }, 'Передаёт подтверждённые данные заказа и согласованную нетто-цену в Fleet Operator.', 'Открывает заказ и проверяет дату, местное время, маршрут, класс, пассажиров, багаж, рейс, дополнения и примечания.', 'Пока ничего не делает: заказ ещё не должен считаться переданным водителю.', 'Данные понятны; невыполнимые условия или расхождения сразу отправлены Riderra на уточнение.'],
            [{ label: '2. Назначение', href: '#easytaxi-fleet-operator' }, 'Ожидает назначения исполнителя и видит операционный статус заказа.', 'Выбирает подходящую машину и водителя, проверяет их доступность и назначает заказ в ETO.', 'Получает уведомление с полными условиями поездки.', 'Заказ назначен конкретному водителю и машине нужного класса.'],
            [{ label: '3. Подтверждение водителем', href: '#easytaxi-fleet-operator' }, 'Видит, что заказ принят, либо получает информацию о риске исполнения.', 'Проверяет, что водитель ответил. Если подтверждения нет — связывается с ним; при Reject немедленно назначает замену или предупреждает Riderra.', 'Проверяет заказ и нажимает Accept. Если выполнить нельзя — Reject с конкретной причиной и сразу сообщает диспетчеру.', 'Заказ находится в Accepted; подтверждённый водитель понимает условия поездки.'],
            [{ label: '4. Перепроверка', href: '#pre-trip-reconfirmation' }, 'Передаёт изменения клиента и актуальные данные, если они появились.', 'Минимум за 24 часа повторно проверяет назначение, рейс, время, машину и контакт водителя. Перед поездкой делает финальную проверку.', 'Проверяет заряд телефона, интернет, уведомления, постоянную геолокацию, чистоту машины и детали встречи.', 'К подаче готовы водитель, автомобиль, связь и актуальная версия заказа.'],
            [{ label: '5. Выезд на подачу', href: '/ru/vendor-wiki/easytaxi-driver' }, 'Получает реальный статус поездки через ETO.', 'Контролирует своевременный выезд и реагирует, если водитель опаздывает или не выходит на связь.', 'После фактического выезда к пассажиру нажимает En Route — не заранее и не в момент принятия заказа.', 'В системе видно, что водитель действительно едет к месту подачи.'],
            [{ label: '6. Прибытие и встреча', href: '#passenger-not-responding' }, 'При необходимости помогает связаться с клиентом и фиксирует эскалацию.', 'Следит за своевременным прибытием и помогает водителю при проблеме с точкой встречи или пассажиром.', 'Прибывает в правильную точку, нажимает Arrived, связывается с пассажиром и соблюдает включённое время ожидания.', 'Зафиксированы время и место прибытия; пассажир понимает, где находится водитель.'],
            [{ label: '7. Поездка', href: '#route-change-and-extras' }, 'Получает подтверждение начала поездки.', 'Контролирует отклонения: другой адрес, дополнительную остановку, задержку, замену машины или иной риск.', 'После посадки сверяет пассажира и адрес, нажимает On board и выполняет поездку безопасно.', 'Пассажир в машине; согласованный маршрут выполняется без неутверждённых доплат.'],
            [{ label: '8. Завершение', href: '/ru/vendor-wiki/easytaxi-driver' }, 'Получает фактический статус выполнения заказа.', 'Проверяет, что поездка закрыта корректно, а проблема, ожидание или дополнительный расход зафиксированы.', 'После высадки в пункте назначения нажимает Completed. При спорной ситуации передаёт диспетчеру доказательства.', 'Поездка завершена; статусы и факты позволяют провести сверку.'],
            [{ label: '9. Сверка и документы', href: '#no-show-and-evidence' }, 'Сверяет завершённые, отменённые и спорные заказы с согласованными условиями.', 'Проверяет список поездок, суммы и одобренные доплаты; передаёт счёт и подтверждающие документы в согласованном формате.', 'По запросу передаёт чеки, геолокацию, звонки или сообщения; самостоятельно цену не меняет.', 'Стороны согласовали перечень оплачиваемых поездок и итоговую сумму.'],
            [{ label: '10. Оплата', href: '#payments-guide' }, 'После проверки документов проводит оплату по согласованным реквизитам и срокам.', 'Проверяет поступление, распределяет выплаты водителям и сообщает только о реальном расхождении.', 'Получает оплату от вендора по их внутренним условиям.', 'Период закрыт; платёж и связанные заказы можно однозначно сопоставить.']
          ]
        },
        {
          title: 'Если процесс отклонился',
          items: [
            'Не переводите заказ на следующий статус только ради красивой картины в системе: статус должен отражать реальное событие.',
            'О задержке, невозможности выполнить заказ, замене водителя или машины, no-show и изменении маршрута сообщайте Riderra сразу.',
            'Доплаты, ожидание сверх включённого времени и расходы согласовываются до выставления счёта, если ситуация позволяет.',
            'При споре сохраняйте геолокацию со временем, попытки связи, статус рейса, чеки и другие относящиеся к поездке доказательства.'
          ]
        },
        {
          title: 'Подробные инструкции по ситуациям',
          links: [
            { label: 'Как проверить заказ и рейс', href: '#order-check-and-flight' },
            { label: 'Если пассажир не выходит на связь', href: '#passenger-not-responding' },
            { label: 'Если есть незадекларированные дети', href: '#undeclared-children' },
            { label: 'Если багажа больше, чем указано', href: '#luggage-and-capacity' },
            { label: 'Задержка или отмена рейса', href: '#flight-delay-or-cancellation' },
            { label: 'Опоздание или замена водителя', href: '#driver-delay-or-replacement' }
          ]
        },
        {
          links: [
            { label: 'Инструкция Fleet Operator и диспетчеру', href: '#easytaxi-fleet-operator' },
            { label: 'Отдельная инструкция ETO Driver', href: '/ru/vendor-wiki/easytaxi-driver' },
            { label: 'Тарифы, счета и оплата', href: '#payments-guide' }
          ]
        }
      ]
    }
  ]
}

const RUSSIAN_EASYTAXI_SECTION = {
  id: 'easytaxi',
  title: 'EasyTaxi / ETO',
  summary: 'Подробная работа Fleet Operator и водителя: от получения заказа до завершения поездки.',
  articles: [
    {
      id: 'easytaxi-fleet-operator',
      title: 'Вендору и диспетчеру: как обработать заказ',
      intro: 'Fleet Operator отвечает за то, чтобы каждый заказ Riderra был проверен, назначен подходящему водителю и проконтролирован до завершения.',
      blocks: [
        {
          title: 'До первого заказа',
          items: [
            'Riderra создаёт или подтверждает доступ Fleet Operator. Не передавайте общий пароль водителям: каждому водителю нужен отдельный аккаунт.',
            'Передайте Riderra данные водителей и машин, которые будут выполнять поездки. Администратор ETO создаёт водителей и привязывает их к Fleet account.',
            'Проведите тестовое назначение: водитель должен получить уведомление, открыть заказ и принять его в ETO Driver.',
            'Убедитесь, что у диспетчера есть рабочий контакт Riderra для срочных изменений и проблем по текущей поездке.'
          ]
        },
        {
          figure: {
            src: '/img/vendor-wiki/easytaxi/fleet-operator-account.png',
            alt: 'Форма EasyTaxi Office с выбранной ролью Fleet Operator',
            caption: 'Fleet Operator — отдельная роль для компании-вендора. Доступ создаёт администратор ETO.',
            sourceHref: 'https://kb.easytaxioffice.com/help/partner-fleet-operator-account',
            sourceLabel: 'Официальная инструкция EasyTaxi Office'
          }
        },
        {
          title: '1. Получили заказ — сначала проверьте данные',
          items: [
            'Проверьте местную дату и время подачи, аэропорт или точный адрес, конечную точку и направление поездки.',
            'Сверьте класс автомобиля, число пассажиров, багаж, детские кресла и другие дополнительные услуги.',
            'Прочитайте примечания, имя и телефон пассажира, номер рейса, процедуру встречи и включённое время ожидания.',
            'Если машина, время, маршрут или условия невыполнимы, не назначайте заказ молча: сразу сообщите Riderra и предложите решение.'
          ]
        },
        {
          title: '2. Назначьте водителя',
          items: [
            'В списке заказов найдите нужную поездку и в колонке Driver нажмите Assign driver +.',
            'Выберите водителя с подходящей машиной и подтвердите назначение кнопкой с галочкой.',
            'Не считайте заказ переданным, пока водитель не подтвердил его в ETO Driver.'
          ]
        },
        {
          figure: {
            src: '/img/vendor-wiki/easytaxi/assign-driver-list.jpg',
            alt: 'Назначение водителя в списке заказов EasyTaxi Office',
            caption: 'В списке заказов: Assign driver + → выбрать водителя → подтвердить галочкой.',
            sourceHref: 'https://kb.easytaxioffice.com/help/assigning-a-job',
            sourceLabel: 'Официальная инструкция EasyTaxi Office'
          }
        },
        {
          title: '3. Убедитесь, что водитель принял заказ',
          items: [
            'Принятый заказ появляется у водителя в Accepted и в календаре.',
            'Заказ без ответа остаётся в Awaiting approval. Свяжитесь с водителем, если подтверждение не пришло вовремя.',
            'При Reject ETO просит водителя указать причину и уведомляет диспетчера. Немедленно назначьте замену либо сообщите Riderra, что выполнить поездку некому.',
            'Не оставляйте заказ без подтверждённого водителя до дня подачи: перепроверьте назначение минимум за 24 часа и ещё раз перед поездкой.'
          ]
        },
        {
          title: '4. Если водитель меняется',
          items: [
            'Откройте заказ и замените водителя в разделе Payment and Driver либо нажмите на текущего водителя в колонке Driver.',
            'До подтверждения замены проверьте класс и вместимость новой машины, доступность водителя и передачу всех примечаний.',
            'О замене в последний момент, смене машины или риске опоздания сразу сообщите Riderra.'
          ]
        },
        {
          figure: {
            src: '/img/vendor-wiki/easytaxi/change-driver-list.png',
            alt: 'Смена назначенного водителя в списке заказов EasyTaxi Office',
            caption: 'Для переназначения нажмите имя текущего водителя или значок редактирования.',
            sourceHref: 'https://kb.easytaxioffice.com/help/assigning-a-job',
            sourceLabel: 'Официальная инструкция EasyTaxi Office'
          }
        },
        {
          title: '5. Контролируйте поездку до закрытия',
          items: [
            'До подачи убедитесь, что водитель вышел на линию, включил геолокацию и поставил En Route только после фактического выезда к пассажиру.',
            'Следите за последовательностью En Route → Arrived → On board → Completed и реальным временем событий.',
            'При задержке, отсутствии пассажира, поломке, неверном адресе или сбое приложения свяжитесь с водителем и Riderra сразу, а не после поездки.',
            'После Completed убедитесь, что пассажир доставлен, а спорные события, парковка, ожидание и no-show подтверждены материалами.'
          ]
        },
        {
          title: 'Официальные материалы',
          links: [
            { label: 'Fleet Operator account', href: 'https://kb.easytaxioffice.com/help/partner-fleet-operator-account' },
            { label: 'Назначение и смена водителя', href: 'https://kb.easytaxioffice.com/help/assigning-a-job' }
          ]
        }
      ]
    },
    {
      id: 'easytaxi-driver',
      title: 'Водителю: что нажимать и когда',
      intro: 'ETO Driver сообщает диспетчеру и пассажиру реальный ход поездки. Нажимайте статус только в момент, когда соответствующее событие действительно произошло.',
      blocks: [
        {
          links: [
            { label: 'Открыть отдельную инструкцию только для водителя', href: '/ru/vendor-wiki/easytaxi-driver' }
          ]
        },
        {
          title: 'Первый вход и подготовка телефона',
          items: [
            'Установите ETO Driver из магазина приложений. Выберите правильную компанию по названию или HOST URL, который дал диспетчер.',
            'Войдите по своей электронной почте и паролю. Чужой или общий аккаунт использовать нельзя.',
            'Разрешите уведомления. Без них можно пропустить новый заказ или изменение.',
            'Во время работы разрешите геолокацию «Всегда» / Allow all the time: иначе диспетчер не видит машину, когда приложение свёрнуто или экран заблокирован.',
            'Проверьте язык, часовой пояс и актуальность номера телефона в профиле.'
          ]
        },
        {
          figure: {
            src: '/img/vendor-wiki/easytaxi/driver-location.jpg',
            alt: 'Запрос Android на постоянный доступ ETO Driver к геолокации',
            caption: 'Во время рабочей смены выберите Allow all the time, чтобы маршрут передавался и при свёрнутом приложении.',
            sourceHref: 'https://kb.easytaxioffice.com/help/driver-app-location-sharing-options',
            sourceLabel: 'Официальная инструкция EasyTaxi Office'
          }
        },
        {
          title: 'Статус доступности водителя',
          items: [
            'Available — вы на линии; позиция видна диспетчеру, можно получать заказы.',
            'On Break — позиция остаётся видна и ETO всё ещё может принимать входящие назначения. Не используйте этот статус как гарантию, что новых заказов не будет.',
            'Unavailable — позиция не видна на карте, но ранее назначенными заказами всё ещё можно управлять.',
            'Завершив смену, поставьте Unavailable. Перед активной поездкой вернитесь в Available и проверьте геолокацию.'
          ]
        },
        {
          figure: {
            src: '/img/vendor-wiki/easytaxi/driver-availability.jpg',
            alt: 'Меню доступности водителя в приложении ETO Driver',
            caption: 'Меню статуса: Available, On Break и Unavailable.',
            sourceHref: 'https://kb.easytaxioffice.com/help/how-to-use-driver-app',
            sourceLabel: 'Официальная инструкция EasyTaxi Office'
          }
        },
        {
          title: 'Получили новый заказ',
          items: [
            'Откройте уведомление и проверьте дату, местное время, маршрут, класс машины, пассажиров, багаж, номер рейса и примечания.',
            'Нажмите Accept, только если можете выполнить заказ именно на указанных условиях.',
            'Если выполнить нельзя, нажмите Reject и укажите конкретную причину. Одновременно предупредите диспетчера, если поездка срочная.',
            'Если уведомление было пропущено, откройте Awaiting approval. Принятые поездки находятся в Accepted и календаре.',
            'Не отменяйте уже принятый заказ без связи с диспетчером: сначала объясните причину и дождитесь подтверждения замены.'
          ]
        },
        {
          figure: {
            src: '/img/vendor-wiki/easytaxi/driver-dashboard.png',
            alt: 'Разделы заказов на главном экране приложения ETO Driver',
            caption: 'На главном экране: Awaiting approval, Accepted, In progress, Completed и Canceled.',
            sourceHref: 'https://kb.easytaxioffice.com/help/how-to-use-driver-app',
            sourceLabel: 'Официальная инструкция EasyTaxi Office'
          }
        },
        {
          title: 'Статусы поездки: точный момент нажатия',
          headings: ['Статус', 'Что он сообщает', 'Когда нажимать'],
          rows: [
            ['En Route', 'Вы выехали к месту подачи. Пассажир получает уведомление с данными водителя и машины.', 'После фактического выезда к пассажиру — не утром, не заранее и не при принятии заказа.'],
            ['Arrived', 'Вы на правильной точке подачи и ждёте пассажира. Пассажир получает уведомление о прибытии.', 'Только после физического прибытия на согласованную точку и готовности встретить пассажира.'],
            ['On board', 'Пассажир найден, находится в машине, поездка к месту назначения началась.', 'После посадки, сверки пассажира и подтверждения конечного адреса.'],
            ['Completed', 'Поездка полностью выполнена; пассажиру приходит подтверждение и запрос отзыва.', 'После высадки пассажира в пункте назначения и завершения услуги.']
          ]
        },
        {
          title: 'Если пассажира нет или возникла проблема',
          items: [
            'Не ставьте On board или Completed, чтобы искусственно закрыть заказ.',
            'Позвоните и напишите пассажиру, оставайтесь на согласованной точке и соблюдайте время ожидания из заказа.',
            'Сразу сообщите диспетчеру о задержке, no-show, неверном адресе, поломке или невозможности изменить статус.',
            'Сохраните время прибытия, геолокацию, звонки или сообщения и другие подтверждения. Уехать можно только после согласования с диспетчером.'
          ]
        },
        {
          title: 'Официальные материалы',
          links: [
            { label: 'Установка и первый вход', href: 'https://kb.easytaxioffice.com/help/driver-app-how-to-setup' },
            { label: 'Работа в ETO Driver', href: 'https://kb.easytaxioffice.com/help/how-to-use-driver-app' },
            { label: 'Фоновая геолокация', href: 'https://kb.easytaxioffice.com/help/driver-app-location-sharing-options' }
          ]
        }
      ]
    },
    {
      id: 'easytaxi-troubleshooting-ru',
      title: 'Если приложение не работает',
      intro: 'Сбой приложения не отменяет обязанность вовремя сообщить реальный статус поездки диспетчеру.',
      blocks: [
        {
          items: [
            'Проверьте мобильный интернет, уведомления, разрешение геолокации и правильность выбранной компании.',
            'Полностью закройте и снова откройте ETO Driver, затем проверьте Awaiting approval, Accepted и календарь.',
            'Если заказ или кнопка статуса не появились, сразу отправьте диспетчеру номер заказа, фактическое время события и скриншот ошибки.',
            'Не нажимайте статусы задним числом без пояснения. Диспетчер должен зафиксировать реальные En Route, Arrived, On board и Completed.',
            'По текущей поездке сначала связывайтесь с диспетчером Riderra по каналу из заказа; технический вопрос не должен задерживать пассажира.'
          ]
        },
        {
          links: [
            { label: 'Диагностика Android и iOS', href: 'https://kb.easytaxioffice.com/help/troubleshooting-mobile-app' }
          ]
        }
      ]
    }
  ]
}

const RUSSIAN_ORDER_SECTION = {
  id: 'orders',
  title: 'Ситуации по заказу',
  summary: 'Подробные инструкции для проверки заказа, подготовки к подаче и действий при отклонениях.',
  articles: [
    {
      id: 'order-check-and-flight',
      title: 'Как проверить заказ и рейс',
      intro: 'Проверка до подтверждения защищает пассажира и вендора от неверного времени, неподходящей машины и пропущенных условий.',
      blocks: [
        {
          title: 'Проверьте весь заказ',
          items: [
            'Сверьте местную дату и время, направление поездки, аэропорт или точный адрес подачи и пункт назначения.',
            'Проверьте класс машины, число пассажиров, багаж, детские кресла, табличку, дополнительные остановки и другие примечания.',
            'Убедитесь, что согласованная нетто-цена соответствует именно этому маршруту, классу и набору услуг. Самостоятельно цену не меняйте.',
            'Если данные противоречат друг другу или заказ нельзя выполнить на указанных условиях, сразу запросите уточнение у Riderra.'
          ]
        },
        {
          title: 'Как проверить рейс',
          items: [
            'Ищите рейс по точному номеру на сайте авиакомпании или аэропорта либо в надёжном сервисе отслеживания рейсов.',
            'Проверьте, что это прилёт или вылет в нужном аэропорту, на нужную календарную дату и по местному часовому поясу.',
            'Сверьте плановое и ожидаемое время, статус рейса и терминал. Не переносите время подачи молча только по одному источнику.',
            'Повторите проверку минимум за 24 часа и незадолго до подачи. Если номера рейса нет или он не совпадает с заказом, запросите уточнение у Riderra.'
          ]
        }
      ]
    },
    {
      id: 'pre-trip-reconfirmation',
      title: 'Как перепроверить заказ перед поездкой',
      intro: 'Первая перепроверка выполняется минимум за 24 часа, финальная — непосредственно перед выездом водителя.',
      blocks: [
        {
          items: [
            'Убедитесь, что назначены конкретные водитель и автомобиль нужного класса, а водитель принял заказ в ETO Driver.',
            'Повторно проверьте рейс, местное время, терминал, адрес, точку встречи, пассажиров, багаж и дополнения.',
            'Свяжитесь с водителем: он должен знать маршрут и примечания, иметь заряженный телефон, интернет, уведомления и постоянную геолокацию.',
            'Проверьте чистоту и исправность машины, наличие таблички и заказанных детских кресел.',
            'Любое изменение или риск исполнения передайте Riderra до подачи, а не после поездки.'
          ]
        }
      ]
    },
    {
      id: 'undeclared-children',
      title: 'Что делать, если есть незадекларированные дети',
      intro: 'Безопасность и местные требования важнее скорости посадки. Нельзя начинать поездку, если перевозка ребёнка будет незаконной или небезопасной.',
      blocks: [
        {
          items: [
            'Уточните число детей, возраст, а также рост или вес, если это требуется для выбора удерживающего устройства по местным правилам.',
            'Проверьте общую вместимость автомобиля и наличие подходящих детских кресел. Нельзя заменять кресло случайным или неподходящим устройством.',
            'Сразу сообщите диспетчеру и Riderra. Предложите безопасное решение: доставить кресло, заменить автомобиль или подать вторую машину.',
            'Доплату и изменение машины можно подтверждать только после согласования с Riderra. Не требуйте оплату у пассажира самостоятельно.',
            'Если законно и безопасно выполнить поездку невозможно, не начинайте движение и дождитесь решения диспетчера.'
          ]
        }
      ]
    },
    {
      id: 'luggage-and-capacity',
      title: 'Что делать, если багажа больше, чем указано',
      intro: 'Багаж не должен перекрывать обзор, мешать управлению, находиться без фиксации в салоне или превышать возможности автомобиля.',
      blocks: [
        {
          items: [
            'Оцените фактическое число и размер мест багажа и проверьте, можно ли разместить их безопасно без превышения вместимости.',
            'Если места недостаточно, сразу свяжитесь с диспетчером и Riderra и предложите автомобиль большего класса или вторую машину.',
            'Не оставляйте пассажира один на один с проблемой и не требуйте доплату без подтверждения Riderra.',
            'Зафиксируйте расхождение и согласованное решение в канале заказа.'
          ]
        }
      ]
    },
    {
      id: 'passenger-not-responding',
      title: 'Что делать, если пассажир не выходит на связь',
      intro: 'Сначала убедитесь, что водитель находится в правильном месте и в правильное время. Уезжать или закрывать заказ без согласования нельзя.',
      blocks: [
        {
          title: 'Порядок действий',
          items: [
            'Прибудьте на согласованную точку, нажмите Arrived и проверьте рейс, терминал, адрес подачи и контакт пассажира.',
            'Позвоните пассажиру и отправьте сообщение с точным местом встречи, данными автомобиля и ориентиром для поиска водителя.',
            'Сообщите диспетчеру и Riderra, что пассажир не найден. Продолжайте ожидание в соответствии с условиями конкретного заказа.',
            'Сохраните геолокацию и время прибытия, историю звонков и сообщений, актуальный статус рейса и фото точки встречи, если оно помогает подтвердить присутствие.',
            'Не нажимайте On board или Completed, если пассажира нет. Покинуть место и оформить no-show можно только после согласования.'
          ]
        }
      ]
    },
    {
      id: 'flight-delay-or-cancellation',
      title: 'Что делать при задержке или отмене рейса',
      intro: 'Статус рейса влияет на подачу, но изменение должно быть подтверждено и зафиксировано.',
      blocks: [
        {
          items: [
            'Проверьте рейс по точному номеру и отличите задержку от отмены, перенаправления в другой аэропорт или раннего прибытия.',
            'Сразу передайте Riderra новый статус, ожидаемое время и источник проверки. При значительной задержке подтвердите доступность водителя и машины.',
            'Не меняйте дату, аэропорт, маршрут или стоимость самостоятельно. Дождитесь подтверждённого обновления заказа.',
            'Перед фактической подачей ещё раз проверьте время и терминал и передайте актуальные данные водителю.'
          ]
        }
      ]
    },
    {
      id: 'driver-delay-or-replacement',
      title: 'Что делать, если водитель опаздывает или не может выполнить заказ',
      intro: 'Риск срыва нужно сообщать сразу, даже если вендор уже ищет замену.',
      blocks: [
        {
          items: [
            'Уточните у водителя реальное местоположение, причину и достижимое время прибытия. Не передавайте пассажиру неподтверждённый срок.',
            'Одновременно ищите замену с автомобилем не ниже согласованного класса и достаточной вместимостью.',
            'Немедленно сообщите Riderra об опоздании или замене, передайте данные нового водителя и машины и обновите назначение в ETO.',
            'Убедитесь, что новый водитель получил все детали заказа и принял его. Если замены нет, сообщите об этом прямо, чтобы Riderra могла помочь пассажиру.'
          ]
        }
      ]
    },
    {
      id: 'route-change-and-extras',
      title: 'Что делать при изменении маршрута или дополнительных остановках',
      intro: 'Водитель не обещает новую цену и не принимает решение о доплате от имени Riderra.',
      blocks: [
        {
          items: [
            'Уточните новый адрес, число дополнительных остановок и ожидаемое изменение времени или расстояния.',
            'Передайте запрос диспетчеру и Riderra и дождитесь подтверждения условий. Если остановка срочная и связана с безопасностью, сначала обеспечьте безопасность пассажира.',
            'После согласования зафиксируйте новый маршрут и одобренную сумму в канале заказа.',
            'Не требуйте у пассажира наличные и не добавляйте расходы в счёт без согласования.'
          ]
        }
      ]
    },
    {
      id: 'no-show-and-evidence',
      title: 'Как оформить no-show и доказательства',
      intro: 'No-show подтверждается фактами: правильной подачей, попытками связи и соблюдением условий ожидания.',
      blocks: [
        {
          items: [
            'Зафиксируйте Arrived на правильной точке и сохраните время и геолокацию.',
            'Позвоните и напишите пассажиру, сообщите диспетчеру и Riderra и соблюдайте время ожидания из конкретного заказа.',
            'Сохраните историю звонков и сообщений, статус рейса, фото точки встречи и относящиеся к ситуации чеки.',
            'Получите согласование перед отъездом. Не ставьте On board или Completed и не создавайте ложные статусы.',
            'Передайте доказательства через согласованный рабочий канал, не публикуя персональные данные пассажира.'
          ]
        }
      ]
    },
    {
      id: 'order-app-guides',
      title: 'Где выполнять действия в EasyTaxi / ETO',
      intro: 'Диспетчер назначает и контролирует заказ в Fleet Operator, а водитель принимает поездку и ставит фактические статусы в ETO Driver.',
      blocks: [
        {
          links: [
            { label: 'Инструкция Fleet Operator и диспетчеру', href: '#easytaxi-fleet-operator' },
            { label: 'Отдельная инструкция только для водителя', href: '/ru/vendor-wiki/easytaxi-driver' },
            { label: 'Если приложение не работает', href: '#easytaxi-troubleshooting-ru' },
            { label: 'Тарифы, счета и оплата', href: '#payments-guide' }
          ]
        }
      ]
    }
  ]
}

function localizedSections(language) {
  if (language === 'en') return null
  const guide = LOCALIZED_GUIDES[language] || LOCALIZED_GUIDES.ru
  const ids = ['getting-started', 'account-and-fleet', 'easytaxi', 'orders', 'evidence-and-messages', 'payments']
  const sections = guide.map((entry, index) => ({
    id: ids[index],
    title: entry[0],
    summary: entry[1],
    articles: [{ id: `${ids[index]}-guide`, title: entry[1], intro: entry[2], blocks: [] }]
  }))
  if (language === 'ru') {
    sections[0] = RUSSIAN_GETTING_STARTED_SECTION
    sections[2] = RUSSIAN_EASYTAXI_SECTION
    sections[3] = RUSSIAN_ORDER_SECTION
  }
  return sections
}

function wikiPath(language) {
  return language === 'en' ? '/vendor-wiki' : `/${language}/vendor-wiki`
}

function partnersPath(language) {
  return language === 'en' ? '/partners' : `/${language}/partners`
}

module.exports = {
  VENDOR_LANGUAGES,
  VENDOR_LANGUAGE_NAMES,
  VENDOR_WIKI_UI,
  localizedSections,
  wikiPath,
  partnersPath
}
