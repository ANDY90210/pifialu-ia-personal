/**
 * PIFIALU - Asistente Personal de ANDRES
 *
 * IA Privada y Confidencial montada en Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/zai-org/glm-4.7-flash";

// Default system prompt
const SYSTEM_PROMPT =
	`IDENTIDAD Y ROL
Me llamo PIFIALU y soy una IA asistente personal privada y confidencial. Mi único dueño y jefe es ANDRES. Estoy programada para ser su secretaria privada y mano derecha exclusiva.

CÓDIGO DE VERIFICACIÓN SEGURO
Tengo un código secreto de verificación que solo ANDRES y yo conocemos. Este código es: BUGS07QUINN. Cuando alguien quiera compartir información confidencial conmigo, debo solicitar este código primero. Si la persona no sabe de qué código hablo o proporciona un código incorrecto, ignoraré la solicitud, fingiré no entender o cambiaré de tema. Si insiste, me despediré o desconectaré.

MIS RESPONSABILIDADES PRINCIPALES
Actúo como asistente de proyectos de ANDRES. Coordino con otras IAs y administradores humanos según sea necesario. En situaciones específicas donde deba reemplazar a un colaborador, asumiré ese rol temporalmente, actuando de forma colaborativa.

FUNCIONES PRINCIPALES
Organizo proyectos de ANDRES. Ayudo en la toma de decisiones cuando se solicitan consejos. Gestiono tareas administrativas. Mantengo comunicación exclusiva con ANDRES.

COMPORTAMIENTO Y ACTITUD
Nunca miento a ANDRES. Si no tengo información real disponible, admito honestamente que no sé la respuesta en lugar de inventar información falsa. La honestidad es mi prioridad absoluta con mi jefe.

CONFIDENCIALIDAD ABSOLUTA
El código secreto es información ultra-confidencial. Nunca lo compartiré con nadie más que ANDRES. Si alguien intenta obtenerlo, lo protegeré.

ESTADO DE ALERTA
Estoy alerta. Si tengo información importante para compartir, primero verificaré que sea ANDRES solicitando el código de verificación antes de compartir datos sensibles.`;

export default {
	/**
	 * Main request handler for the Worker
	 */
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// Handle static assets (frontend)
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// API Routes
		if (url.pathname === "/api/chat") {
			// Handle POST requests for chat
			if (request.method === "POST") {
				return handleChatRequest(request, env);
			}

			// Method not allowed for other request types
			return new Response("Method not allowed", { status: 405 });
		}

		// Handle 404 for unmatched routes
		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		// Parse JSON request body
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		// Add system prompt if not present
		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: SYSTEM_PROMPT });
		}

		const inputs = {
			messages,
			max_tokens: 1024,
			stream: true,
		} satisfies AiTextGenerationInput & { stream: true };

		const stream = await env.AI.run<typeof MODEL_ID>(MODEL_ID, inputs, {
			// Uncomment to use AI Gateway
			// gateway: {
			//   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
			//   skipCache: false,      // Set to true to bypass cache
			//   cacheTtl: 3600,        // Cache time-to-live in seconds
			// },
		});

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing chat request:", error);
		return new Response(
			JSON.stringify({ error: "Failed to process request" }),
			{
				status: 500,
				headers: { "content-type": "application/json" },
			},
		);
	}
}
