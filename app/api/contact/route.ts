import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialisation de Resend avec ta clé d'environnement
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validation basique
    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email et message obligatoires.' },
        { status: 400 }
      );
    }

    // Envoi de l'e-mail via Resend
    const data = await resend.emails.send({
      
      from: 'Contact <contact@nesis.fr>',
      to: ['contact@nesis.fr'],
      subject: `Nouveau message de contact de ${name || email}`,
      replyTo: email,
      text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du mail:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur.' },
      { status: 500 }
    );
  }
}
