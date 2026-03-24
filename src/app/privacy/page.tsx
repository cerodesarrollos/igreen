export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
      <p className="text-sm text-gray-500 mb-8">Última actualización: marzo 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Información que recopilamos</h2>
        <p>iGreen recopila mensajes enviados a través de Instagram Direct con el fin de gestionar consultas de clientes sobre productos Apple. La información incluye el contenido del mensaje, nombre de usuario y fecha/hora del envío.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Uso de la información</h2>
        <p>Los datos recopilados se utilizan exclusivamente para:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Responder consultas de clientes sobre disponibilidad y precios de productos</li>
          <li>Gestionar el proceso de venta y postventa</li>
          <li>Mejorar la atención al cliente</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Almacenamiento y seguridad</h2>
        <p>Los mensajes se almacenan en servidores seguros con cifrado en tránsito y en reposo. No compartimos datos personales con terceros salvo requerimiento legal.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Retención de datos</h2>
        <p>Los datos de conversaciones se conservan por un máximo de 12 meses. Podés solicitar la eliminación de tus datos enviando un email a <a href="mailto:contacto@igreen.com.ar" className="text-green-600 underline">contacto@igreen.com.ar</a>.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Permisos de Instagram</h2>
        <p>Esta aplicación utiliza la API de Instagram para recibir y responder mensajes directos. Solo accedemos a conversaciones iniciadas por usuarios que nos contactan. No accedemos a tu perfil ni publicaciones.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Contacto</h2>
        <p>Para consultas sobre privacidad, contactanos en <a href="mailto:contacto@igreen.com.ar" className="text-green-600 underline">contacto@igreen.com.ar</a> o por Instagram <a href="https://instagram.com/igreen.recoleta" className="text-green-600 underline">@igreen.recoleta</a>.</p>
      </section>
    </div>
  );
}
