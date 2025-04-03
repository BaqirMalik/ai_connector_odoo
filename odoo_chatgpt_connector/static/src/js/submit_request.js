/** @odoo-module **//*

import publicWidget from '@web/legacy/js/public/public_widget';
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";

publicWidget.registry.QuestionInput = publicWidget.Widget.extend({
    selector: "#main_layout",
    events: {
        'click #send_button': 'get_answer',
        'click #copy_content': 'copy',
    },
    */
/**
     * @constructor
     *//*

    init: function() {
        this._super(...arguments);
        this.orm = this.bindService("orm");
        this.notification = this.bindService("notification");
        this.api_key = "";
    },
    */
/* For getting the Answer of submitted question *//*

    get_answer: async function(event) {
        $(event.currentTarget).prop("disabled", true);
        $('#result_area')[0].placeholder = "Loading.....";

        try {
            // Get API key
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
                'user_id': user.userId,
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

                // Append previous chat history instead of replacing
                const previousChats = $("#result_area").val();
                const newChat = `You: ${question}\nAI: ${responseText.trim()}\n\n`;
                $("#result_area").val(previousChats + newChat);

                historyData.response_text = responseText.trim();
            } else if (result.promptFeedback?.blockReason) {
                throw new Error(`Response blocked: ${result.promptFeedback.blockReason}`);
            } else {
                throw new Error("Unexpected response format from Gemini");
            }

            await this.orm.create('ai.chat.history', [historyData]);

            // Clear the question input field
            $('#question_input').val('');

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

    */
/* For copying the Answer to the clipboard *//*

    copy: function(event) {
        var textToCopy = $("#result_area").val();
        var tempTextarea = $('<textarea>');
        $('body').append(tempTextarea);
        tempTextarea.val(textToCopy).select();
        document.execCommand('copy');
        tempTextarea.remove();
    },
});
*/



/** @odoo-module **/
import publicWidget from '@web/legacy/js/public/public_widget';
import { _t } from "@web/core/l10n/translation";
import { user } from "@web/core/user";


publicWidget.registry.AIChatWidget = publicWidget.Widget.extend({
    selector: '.oe_chatter_floating',
    events: {
        'click .oe_chatter_button': '_onToggleChat',
        'click .oe_chatter_close': '_onToggleChat',
        'click .oe_chatter_send': '_onSendMessage',
        'keypress .oe_chatter_input input': '_onKeyPress',
    },

    init: function(parent, options) {
        this._super.apply(this, arguments);
        // Use this.bindService for services in public widgets
        this.orm = this.bindService("orm");
        this.notification = this.bindService("notification");
        this.api_key = "";
        this.chatHistory = [];
    },

    start: function() {
        this._super.apply(this, arguments);
        this.$button = this.$('.oe_chatter_button');
        this.$window = this.$('.oe_chatter_window');
        this.$messages = this.$('.oe_chatter_messages');
        this.$input = this.$('.oe_chatter_input input');
        this.$sendBtn = this.$('.oe_chatter_send');

        // Load API key and initial chat history
        this._loadApiKey().then(() => this._loadChatHistory());
    },

    _loadApiKey: function() {
        return this.orm.call('ir.config_parameter', 'get_param', ['odoo_chatgpt_connector.api_key'])
            .then(key => {
                this.api_key = key || "";
                if (!this.api_key) {
                    this._addSystemMessage("API key is not configured. Please contact administrator.");
                }
            });
    },

    _loadChatHistory: function() {
        var self = this;
        return this.orm.searchRead('ai.chat.history',
            [['user_id', '=', this.getSession().user_id]],
            ['request_text', 'response_text', 'create_date'],
            {limit: 10, order: 'create_date DESC'}
        ).then(function(history) {
            self.chatHistory = history.reverse();
            self._renderChatHistory();
        });
    },

    _renderChatHistory: function() {
        this.$messages.empty();
        var self = this;
        this.chatHistory.forEach(function(msg) {
            self._addMessage(msg.request_text, 'user');
            self._addMessage(msg.response_text, 'ai');
        });
        this._scrollToBottom();
    },

    _onToggleChat: function(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        this.$window.toggle();
        if (this.$window.is(':visible')) {
            this.$input.focus();
        }
    },

    _onKeyPress: function(ev) {
        if (ev.which === 13) { // Enter key
            this._onSendMessage(ev);
        }
    },

    _onSendMessage: function(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        var message = this.$input.val().trim();
        if (!message) return;

        this.$input.val('');
        this.$input.prop('disabled', true);
        this.$sendBtn.prop('disabled', true);

        var self = this;

        try {
            this._addMessage(message, 'user');

            if (!this.api_key) {
                throw new Error("API key not configured");
            }

            this._callGeminiAPI(message).then(function(response) {
                self._addMessage(response, 'ai');
                return self._saveChatHistory(message, response);
            }).catch(function(error) {
                console.error("Chat error:", error);
                self._addMessage("Error: " + error.message, 'ai');
            }).finally(function() {
                self.$input.prop('disabled', false);
                self.$sendBtn.prop('disabled', false);
                self.$input.focus();
            });

        } catch (error) {
            console.error("Error:", error);
            this._addMessage("Error: " + error.message, 'ai');
            this.$input.prop('disabled', false);
            this.$sendBtn.prop('disabled', false);
            this.$input.focus();
        }
    },

    _callGeminiAPI: function(message) {
        var url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.api_key}`;
        var self = this;

        return fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                contents: [{
                    parts: [{text: message}]
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
        })
        .then(function(response) {
            if (!response.ok) {
                return response.json().then(function(err) {
                    throw new Error(err.error?.message || "API request failed");
                });
            }
            return response.json();
        })
        .then(function(data) {
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                return data.candidates[0].content.parts[0].text.trim();
            }
            throw new Error("Unexpected response format");
        });
    },

    _saveChatHistory: function(request, response) {
        return this.orm.create('ai.chat.history', [{
            user_id: this.getSession().user_id,
            request_text: request,
            response_text: response
        }]);
    },

    _addMessage: function(text, type) {
        var msg = $('<div>').addClass('message ' + type + '-message').text(text);
        this.$messages.append(msg);
        this._scrollToBottom();
    },

    _addSystemMessage: function(text) {
        var msg = $('<div>').addClass('message system-message').text(text);
        this.$messages.append(msg);
        this._scrollToBottom();
    },

    _scrollToBottom: function() {
        this.$messages.scrollTop(this.$messages[0].scrollHeight);
    },

    getSession: function() {
        // In public widgets, we can access user context like this
        return {
            user_id: user.userId || null
        };
    }
});