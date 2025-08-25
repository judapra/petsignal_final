import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pet } from './placeholder-data';
import { format } from 'date-fns';

// Adiciona uma fonte que suporte caracteres latinos, como o português
// A fonte padrão do jsPDF (Helvetica) não tem todos os acentos
// Uma alternativa é usar uma fonte como a "Roboto" que pode ser embutida.
// Por simplicidade, vamos tentar com a fonte padrão e ver o resultado.
// Se os acentos não funcionarem, precisaremos embutir uma fonte.

export function exportPetProfileAsPdf(pet: Pet) {
    const doc = new jsPDF();

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            // Garante que a data seja interpretada como UTC para evitar problemas de fuso horário
            const date = new Date(dateString);
            const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            return format(utcDate, 'dd/MM/yyyy');
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

    let finalY = (doc as any).lastAutoTable.finalY || 40;

    const checkPageBreak = (neededSpace: number) => {
        if (finalY + neededSpace > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            finalY = 20;
        }
    }

    // Seção de Vacinas
    if (pet.vaccinations && pet.vaccinations.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(16);
        doc.text('Carteira de Vacinação', 14, finalY + 15);
        autoTable(doc, {
            startY: finalY + 20,
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
        finalY = (doc as any).lastAutoTable.finalY;
    }

    // Seção de Medicamentos
    if (pet.medications && pet.medications.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(16);
        doc.text('Medicamentos', 14, finalY + 15);
        autoTable(doc, {
            startY: finalY + 20,
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
        finalY = (doc as any).lastAutoTable.finalY;
    }
    
    // Seção de Consultas
    if (pet.consultations && pet.consultations.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(16);
        doc.text('Histórico de Consultas', 14, finalY + 15);
        autoTable(doc, {
            startY: finalY + 20,
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
        finalY = (doc as any).lastAutoTable.finalY;
    }
    
    // Seção de Exames
     if (pet.exams && pet.exams.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(16);
        doc.text('Histórico de Exames', 14, finalY + 15);
        autoTable(doc, {
            startY: finalY + 20,
            head: [['Data', 'Tipo de Exame', 'Resultado']],
            body: pet.exams.map(e => [
                formatDate(e.date),
                e.type,
                e.results || 'Ver anexo'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [5, 33, 51] },
        });
        finalY = (doc as any).lastAutoTable.finalY;
    }

    // Salva o arquivo
    doc.save(`relatorio_saude_${pet.name.toLowerCase().replace(/ /g, '_')}.pdf`);
}