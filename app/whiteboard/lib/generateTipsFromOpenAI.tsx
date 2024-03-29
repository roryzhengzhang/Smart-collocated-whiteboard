import { Editor, TLShapeId, createShapeId } from '@tldraw/tldraw'
import { GPT4Message, MessageContent, fetchFromOpenAi } from './fetchFromOpenAi'

// the system prompt explains to gpt-4 what we want it to do and how it should behave.
const systemPrompt = `Imagine you're the GPT-4 AI, assigned to support a team in their brainstorming sessions. During these sessions, every team member adds their notes to a whiteboard, each note touching on different facets a main subject or subtasks of a main goal. Your task involves analyzing a note that's currently being developed (source note). Your objective is to generate three notes that have a (selectWard) relationship with the source note. Return the response in the provided JSON format.`
// const systemPrompt = `Imagine you're the GPT-4 AI, assigned to support a team in their brainstorming sessions. During these sessions, every team member adds their notes to a whiteboard, each note touching on different facets a main subject or subtasks of a main goal. Your task involves analyzing a note that's currently being developed (source note), along with other existing notes (target notes). Your objective is to provide insights to a group of collaborators, inspiring them how they may collaborate between the source and target notes. At the same time, also identify the keywords (key phrases) in your answer that you think can be further explored. Highlight keyword as much as possible. Return the response in the provided JSON format.`

const assistantPrompt = `
The input JSON objects follow this format:
{
	"source_note": "content of the source note",
	"selectWord":"selectWord of the source note"
}

The returned JSON objects should follow this format:
{
    "tips": [
        {
            "note": "word that have a (selectWord) relationship with the source note",
        },
        {
            ...
        }
    ]
}

Example of return JSON object:
{
	"source_note": "book",
	"selectWord":"at location"
}

Example of return JSON object:
{
	"tips": [
		{
			"note": "bookstore",
		},
		{
			"note": "library",
		},
		{
			"note": "classroom",
		}
	]
}
`

export async function generateTipsForObject(editor: Editor, srcId: string, text: String) {
	// first, we build the prompt that we'll send to openai.
	const prompt = await buildPromptForOpenAi(editor, srcId, text)

	// TODO: create effect to show loading edges

	try {
		// If you're using the API key input, we preference the key from there.
		// It's okay if this is undefined—it will just mean that we'll use the
		// one in the .env file instead.
		const apiKeyFromDangerousApiKeyInput = (
			document.body.querySelector('#openai_key_risky_but_cool') as HTMLInputElement
		)?.value

		// make a request to openai. `fetchFromOpenAi` is a next.js server action,
		// so our api key is hidden.
		const openAiResponse = await fetchFromOpenAi(apiKeyFromDangerousApiKeyInput, {
			model: 'gpt-4-1106-preview',
			// model: process.env.MODEL_VERSION,
			response_format: { type: 'json_object' },
			max_tokens: 4096,
			temperature: 0,
			messages: prompt,
		})

		if (openAiResponse.error) {
			throw new Error(openAiResponse.error.message)
		}

		const response = openAiResponse.choices[0].message.content

		const parsed_res = JSON.parse(response)
		console.log('openAiResponse: ', parsed_res)

		return parsed_res.tips

		// populate the response shape with the html we got back from openai.
		// TODO: populate the edges between selected shapes
	} catch (e) {
		// if something went wrong, get rid of the unnecessary response shape

		// TODO: create effect to hide loading edges
		throw e
	}
}

async function buildPromptForOpenAi(
	editor: Editor,
	srcId: string,
	text: string
): Promise<GPT4Message[]> {
	// get all text within the current selection
	const jsonInput = getShapesText(editor, srcId, text)

	console.log('shape text json: ', jsonInput)

	// the user messages describe what the user has done and what they want to do next. they'll get
	// combined with the system prompt to tell gpt-4 what we'd like it to do.
	const userMessages: MessageContent = [
		{
			type: 'text',
			text: 'Here is the source note and the selected word. Please  generate three notes that have a (selectWord) relationship with the source note. The input JSON format is as described in the assistant prompt. Below is the input JSON:',
		},
		{
			// send the text of all selected shapes, so that GPT can use it as a reference (if anything is hard to see)
			type: 'text',
			text: jsonInput !== '' ? jsonInput : 'Oh, it looks like there was not any note.',
		},
	]

	// combine the user prompt with the system prompt
	return [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: userMessages },
		{ role: 'assistant', content: assistantPrompt },
	]
}

function getShapesText(editor: Editor, srcId: string, text: string) {
	const allShapes = editor.getCurrentPageShapes()

	// const json = Array.from(allShapes)
	// 	.map((shape) => {
	// 		if (shape.type === 'node' && shape.id !== srcId) {
	// 			// @ts-expect-error
	// 			return { text: shape.props.text, id: shape.id }
	// 		}
	// 		return { text: null, id: null }
	// 	})
	// 	.filter((v) => v.text !== null && v.text !== '')

	const res = {
		source_note: editor.getShape(srcId).props.text,
		selectWord: text,
		// target_notes: json,
	}

	return JSON.stringify(res)
}
