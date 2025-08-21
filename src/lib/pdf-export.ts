
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pet } from './placeholder-data';
import { format } from 'date-fns';

// Adiciona uma fonte que suporte caracteres latinos, como o português
import { calligraffitti } from './calligraffitti-normal';

export function exportPetProfileAsPdf(pet: Pet) {
    const doc = new jsPDF();

    // Adiciona a fonte customizada
    doc.addFileToVFS("Calligraffitti-Regular.ttf", calligraffitti);
    doc.addFont("Calligraffitti-Regular.ttf", "Calligraffitti", "normal");
    doc.setFont("Calligraffitti");
    
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'dd/MM/yyyy');
        } catch {
            return dateString;
        }
    }

    // Título do Documento
    doc.setFontSize(22);
    doc.text(`Perfil de Saúde: ${pet.name}`, 14, 20);

    // Seção de Detalhes do Pet
    doc.setFontSize(16);
    doc.text('Informações Gerais', 14, 35);
    autoTable(doc, {
        startY: 40,
        head: [['Campo', 'Valor']],
        body: [
            ['Espécie', pet.species || 'N/A'],
            ['Raça', pet.breed || 'N/A'],
            ['Data de Nasc.', `${formatDate(pet.birthDate)} ${pet.isBirthDateApproximate ? '(Aprox.)' : ''}`],
            ['Peso Atual', pet.weight ? `${pet.weight} kg` : 'N/A'],
            ['Castrado(a)', pet.isSpayed ? 'Sim' : 'Não'],
            ['Microchip', pet.microchip || 'N/A'],
            ['Plano de Saúde', pet.healthPlan || 'N/A'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [5, 33, 51] }, // Azul escuro do tema
    });

    const finalYAfterDetails = (doc as any).lastAutoTable.finalY || 40;

    // Seção de Vacinas
    if (pet.vaccinations && pet.vaccinations.length > 0) {
        doc.setFontSize(16);
        doc.text('Carteira de Vacinação', 14, finalYAfterDetails + 15);
        autoTable(doc, {
            startY: finalYAfterDetails + 20,
            head: [['Vacina', 'Data', 'Veterinário(a)', 'Próxima Dose']],
            body: pet.vaccinations.map(v => [
                v.vaccineName,
                formatDate(v.date),
                v.vetName,
                formatDate(v.nextApplicationDate)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [5, 33, 51] },
        });
    }

    const finalYAfterVaccines = (doc as any).lastAutoTable.finalY || finalYAfterDetails;

    // Seção de Medicamentos
    if (pet.medications && pet.medications.length > 0) {
        doc.setFontSize(16);
        doc.text('Medicamentos', 14, finalYAfterVaccines + 15);
        autoTable(doc, {
            startY: finalYAfterVaccines + 20,
            head: [['Nome', 'Dosagem', 'Frequência', 'Início', 'Fim']],
            body: pet.medications.map(m => [
                m.name,
                m.dosage,
                m.frequency,
                formatDate(m.startDate),
                formatDate(m.endDate)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [5, 33, 51] },
        });
    }

    const finalYAfterMedications = (doc as any).lastAutoTable.finalY || finalYAfterVaccines;
    
    // Seção de Consultas
    if (pet.consultations && pet.consultations.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Histórico de Consultas', 14, 20);
        autoTable(doc, {
            startY: 25,
            head: [['Data', 'Motivo', 'Veterinário(a)', 'Local']],
            body: pet.consultations.map(c => [
                formatDate(c.date),
                c.reason,
                c.vetName,
                c.location || 'N/A'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [5, 33, 51] },
        });
    }
    
    // Seção de Exames
     if (pet.exams && pet.exams.length > 0) {
        const finalYAfterConsultations = (doc as any).lastAutoTable.finalY || 25;
        doc.setFontSize(16);
        doc.text('Histórico de Exames', 14, finalYAfterConsultations + 15);
        autoTable(doc, {
            startY: finalYAfterConsultations + 20,
            head: [['Data', 'Tipo de Exame', 'Resultado']],
            body: pet.exams.map(e => [
                formatDate(e.date),
                e.type,
                e.results || 'Ver anexo'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [5, 33, 51] },
        });
    }


    // Salva o arquivo
    doc.save(`relatorio_saude_${pet.name.toLowerCase().replace(/ /g, '_')}.pdf`);
}
