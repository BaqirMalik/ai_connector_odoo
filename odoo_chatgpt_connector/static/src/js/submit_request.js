/** @odoo-module **/
import publicWidget from '@web/legacy/js/public/public_widget';
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";

publicWidget.registry.QuestionInput = publicWidget.Widget.extend({
    selector: "#main_layout",
    events: {
        'click #send_button': 'get_answer',
        'click #copy_content': 'copy',
    },
    /**
     * @constructor
     */
    init: function() {
        this._super(...arguments);
        this.orm = this.bindService("orm");
        this.notification = this.bindService("notification");
        this.api_key = "";
    },
    /* For getting the Answer of submitted question */
    get_answer: async function(event) {
    $(event.currentTarget).prop("disabled", true);
    $('#result_area').val('');
    $('#result_area')[0].placeholder = "Loading.....";

    try {
        // Get API key - modified to properly await the result
        this.api_key = await this.orm.call(
            "ir.config_parameter",
            "get_param",
            ["odoo_chatgpt_connector.api_key"]
        );

        if (!this.api_key || this.api_key.trim() === "") {
            throw new Error("API key is not configured in system parameters");
        }

        var question = $('#question_input').val();
        if (!question || question.trim() === "") {
            $('#result_area')[0].placeholder = "Please enter your request";
            this.notification.add(
                _t("Please enter your request"),
                { type: 'danger', sticky: false },
            );
            return;
        }
        const historyData = {
            'user_id': user.userId,  // Fixed user_id reference
            'request_text': question,
        };
        // Gemini API configuration
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.api_key}`;
        console.log("Full API URL:", apiUrl); // Debug log

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: question
                    }]
                }],
                safetySettings: [{
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 1000
                }
            })
        };

        const response = await fetch(apiUrl, requestOptions);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const result = await response.json();

        if (result.candidates && result.candidates[0]?.content?.parts) {
            const responseText = result.candidates[0].content.parts[0].text;
            $('#result_area').val(responseText.trim());
            historyData.response_text = responseText.trim();
        } else if (result.promptFeedback?.blockReason) {
            throw new Error(`Response blocked: ${result.promptFeedback.blockReason}`);
        } else {
            throw new Error("Unexpected response format from Gemini");
        }
    await this.orm.create('ai.chat.history', [historyData]);
    } catch (error) {
        console.error("Error:", error);
        $('#result_area')[0].placeholder = "Error occurred";
        this.notification.add(
            _t("Error: ") + error.message,
            { type: 'danger', sticky: false },
        );
    } finally {
        $(event.currentTarget).prop("disabled", false);
    }
},
    /* For copying the Answer to the clipboard */
    copy: function(event) {
        var textToCopy = $("#result_area").val();
        var tempTextarea = $('<textarea>');
        $('body').append(tempTextarea);
        tempTextarea.val(textToCopy).select();
        document.execCommand('copy');
        tempTextarea.remove();
    },
});
