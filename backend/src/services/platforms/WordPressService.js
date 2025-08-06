"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordPressService = void 0;
var node_fetch_1 = require("node-fetch");
var sharp = require('sharp');
var WordPressService = /** @class */ (function () {
    function WordPressService() {
        this.apiVersion = 'tribe/events/v1';
        this.wpApiVersion = 'wp/v2';
        this.siteUrl = process.env.WORDPRESS_SITE_URL || '';
        this.username = process.env.WORDPRESS_USERNAME || '';
        this.password = process.env.WORDPRESS_PASSWORD || '';
        this.jwtToken = '';
        if (!this.siteUrl || !this.username || !this.password) {
            throw new Error('WordPress credentials not configured. Please set WORDPRESS_SITE_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD environment variables.');
        }
    }
    /**
     * Get headers for WordPress API requests
     */
    WordPressService.prototype.getHeaders = function (includeAuth) {
        if (includeAuth === void 0) { includeAuth = true; }
        var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        if (includeAuth) {
            if (this.jwtToken) {
                headers['Authorization'] = "Bearer ".concat(this.jwtToken);
            }
            else {
                // Fallback to basic auth
                var credentials = Buffer.from("".concat(this.username, ":").concat(this.password)).toString('base64');
                headers['Authorization'] = "Basic ".concat(credentials);
            }
        }
        return headers;
    };
    /**
     * Authenticate with WordPress and get JWT token
     */
    WordPressService.prototype.authenticate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/jwt-auth/v1/token"), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    username: this.username,
                                    password: this.password
                                })
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            // If JWT plugin not available, use basic auth
                            console.warn('JWT authentication failed, falling back to basic auth');
                            return [2 /*return*/, ''];
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        result = _a.sent();
                        this.jwtToken = result.token;
                        console.log('✅ WordPress JWT authentication successful');
                        return [2 /*return*/, result.token];
                    case 3:
                        error_1 = _a.sent();
                        console.warn('JWT authentication not available, using basic auth:', error_1);
                        return [2 /*return*/, ''];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test WordPress connection
     */
    WordPressService.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, siteInfo, eventsResponse, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        // Try to authenticate first
                        return [4 /*yield*/, this.authenticate()];
                    case 1:
                        // Try to authenticate first
                        _a.sent();
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/wp/v2/"), {
                                headers: this.getHeaders(false)
                            })];
                    case 2:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("WordPress API Error: ".concat(response.status, " ").concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 3:
                        siteInfo = _a.sent();
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/events"), {
                                headers: this.getHeaders()
                            })];
                    case 4:
                        eventsResponse = _a.sent();
                        if (!eventsResponse.ok) {
                            throw new Error('The Events Calendar plugin not found or API not accessible');
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: 'WordPress and Events Calendar API connection successful',
                                siteInfo: {
                                    name: siteInfo.name,
                                    description: siteInfo.description,
                                    url: siteInfo.url,
                                    timezone: siteInfo.timezone_string
                                }
                            }];
                    case 5:
                        error_2 = _a.sent();
                        return [2 /*return*/, {
                                success: false,
                                message: "WordPress connection failed: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error')
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Optimize image for WordPress upload
     */
    WordPressService.prototype.optimizeImage = function (imageUrlOrPath) {
        return __awaiter(this, void 0, void 0, function () {
            var imageBuffer, imageResponse, fs, optimized, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        console.log("\uD83D\uDDBC\uFE0F Optimizing image from: ".concat(imageUrlOrPath));
                        imageBuffer = void 0;
                        if (!imageUrlOrPath.startsWith('http')) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, node_fetch_1.default)(imageUrlOrPath)];
                    case 1:
                        imageResponse = _a.sent();
                        if (!imageResponse.ok) {
                            throw new Error("Failed to fetch image: ".concat(imageResponse.statusText));
                        }
                        return [4 /*yield*/, imageResponse.buffer()];
                    case 2:
                        imageBuffer = _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        fs = require('fs').promises;
                        return [4 /*yield*/, fs.readFile(imageUrlOrPath)];
                    case 4:
                        imageBuffer = _a.sent();
                        // TEMPORARY BYPASS FOR SHARP IN DEVELOPMENT
                        if (process.env.NODE_ENV === 'development' && !imageUrlOrPath.startsWith('http')) {
                            console.warn('Development mode: Bypassing sharp optimization for local image due to environment issues.');
                            return [2 /*return*/, imageBuffer]; // Return original buffer without sharp processing
                        }
                        _a.label = 5;
                    case 5: return [4 /*yield*/, sharp(imageBuffer)
                            .resize(1200, 630, {
                            fit: 'cover',
                            position: 'center'
                        })
                            .jpeg({
                            quality: 85,
                            progressive: true
                        })
                            .toBuffer()];
                    case 6:
                        optimized = _a.sent();
                        console.log("\uD83D\uDDBC\uFE0F Image optimized: ".concat(imageBuffer.length, " \u2192 ").concat(optimized.length, " bytes"));
                        return [2 /*return*/, optimized];
                    case 7:
                        error_3 = _a.sent();
                        console.error('🖼️ Error optimizing image:', error_3);
                        throw error_3;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Upload image to WordPress media library
     */
    WordPressService.prototype.uploadImage = function (imageUrl_1) {
        return __awaiter(this, arguments, void 0, function (imageUrl, title) {
            var optimizedImage, FormData_1, formData, filename, contentType, response, error, result, error_4;
            if (title === void 0) { title = 'Event Banner'; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 6, , 7]);
                        console.log("\uD83D\uDCE4 Uploading image to WordPress: ".concat(title));
                        return [4 /*yield*/, this.optimizeImage(imageUrl)];
                    case 1:
                        optimizedImage = _a.sent();
                        FormData_1 = require('form-data');
                        formData = new FormData_1();
                        filename = "".concat(title.toLowerCase().replace(/[^a-z0-9]/g, '-'), ".jpg");
                        contentType = 'image/jpeg';
                        formData.append('file', optimizedImage, {
                            filename: filename,
                            contentType: contentType
                        });
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.wpApiVersion, "/media"), {
                                method: 'POST',
                                headers: __assign(__assign({}, this.getHeaders()), formData.getHeaders() // Include Content-Type with boundary
                                ),
                                body: formData
                            })];
                    case 2:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.text()];
                    case 3:
                        error = _a.sent();
                        throw new Error("WordPress media upload failed: ".concat(response.status, " - ").concat(error));
                    case 4: return [4 /*yield*/, response.json()];
                    case 5:
                        result = _a.sent();
                        console.log("\uD83D\uDCE4 Image uploaded successfully: ID ".concat(result.id));
                        return [2 /*return*/, result.id];
                    case 6:
                        error_4 = _a.sent();
                        console.error('📤 Error uploading image to WordPress:', error_4);
                        throw error_4;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create event in WordPress using The Events Calendar
     */
    WordPressService.prototype.createEvent = function (eventData) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, result, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        console.log("\uD83D\uDCC5 Creating WordPress event: ".concat(eventData.title));
                        if (!!this.jwtToken) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.authenticate()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/events"), {
                            method: 'POST',
                            headers: this.getHeaders(),
                            body: JSON.stringify(eventData)
                        })];
                    case 3:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 5];
                        return [4 /*yield*/, response.text()];
                    case 4:
                        error = _a.sent();
                        throw new Error("WordPress Events API Error: ".concat(response.status, " - ").concat(error));
                    case 5: return [4 /*yield*/, response.json()];
                    case 6:
                        result = _a.sent();
                        console.log("\uD83D\uDCC5 WordPress event created successfully: ".concat(result.id));
                        return [2 /*return*/, {
                                id: result.id.toString(),
                                url: result.link
                            }];
                    case 7:
                        error_5 = _a.sent();
                        console.error('📅 Error creating WordPress event:', error_5);
                        throw error_5;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a new venue in WordPress
     */
    WordPressService.prototype.createVenue = function (venueData) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, venuesResponse, venues, result, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 8, , 9]);
                        console.log("\uD83C\uDFE2 Creating WordPress venue: ".concat(venueData.venue));
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/venues"), {
                                method: 'POST',
                                headers: this.getHeaders(),
                                body: JSON.stringify(venueData)
                            })];
                    case 1:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 6];
                        return [4 /*yield*/, response.text()];
                    case 2:
                        error = _a.sent();
                        if (!error.includes('venue_exists')) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/venues?search=").concat(encodeURIComponent(venueData.venue)), {
                                headers: this.getHeaders()
                            })];
                    case 3:
                        venuesResponse = _a.sent();
                        return [4 /*yield*/, venuesResponse.json()];
                    case 4:
                        venues = _a.sent();
                        if (venues.venues && venues.venues.length > 0) {
                            console.log("\uD83C\uDFE2 Venue already exists, using existing ID: ".concat(venues.venues[0].id));
                            return [2 /*return*/, venues.venues[0].id];
                        }
                        _a.label = 5;
                    case 5: throw new Error("WordPress Venues API Error: ".concat(response.status, " - ").concat(error));
                    case 6: return [4 /*yield*/, response.json()];
                    case 7:
                        result = _a.sent();
                        console.log("\uD83C\uDFE2 WordPress venue created successfully: ".concat(result.id));
                        return [2 /*return*/, result.id];
                    case 8:
                        error_6 = _a.sent();
                        console.error('🏢 Error creating WordPress venue:', error_6);
                        throw error_6;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update existing WordPress event
     */
    WordPressService.prototype.updateEvent = function (eventId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log("\uD83D\uDCC5 Updating WordPress event: ".concat(eventId));
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/events/").concat(eventId), {
                                method: 'PUT',
                                headers: this.getHeaders(),
                                body: JSON.stringify(updates)
                            })];
                    case 1:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.text()];
                    case 2:
                        error = _a.sent();
                        throw new Error("WordPress update failed: ".concat(response.status, " - ").concat(error));
                    case 3:
                        console.log("\uD83D\uDCC5 WordPress event updated successfully: ".concat(eventId));
                        return [2 /*return*/, true];
                    case 4:
                        error_7 = _a.sent();
                        console.error('📅 Error updating WordPress event:', error_7);
                        throw error_7;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete WordPress event
     */
    WordPressService.prototype.deleteEvent = function (eventId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        console.log("\uD83D\uDDD1\uFE0F Deleting WordPress event: ".concat(eventId));
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/events/").concat(eventId), {
                                method: 'DELETE',
                                headers: this.getHeaders()
                            })];
                    case 1:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.text()];
                    case 2:
                        error = _a.sent();
                        throw new Error("WordPress delete failed: ".concat(response.status, " - ").concat(error));
                    case 3:
                        console.log("\uD83D\uDDD1\uFE0F WordPress event deleted successfully: ".concat(eventId));
                        return [2 /*return*/, true];
                    case 4:
                        error_8 = _a.sent();
                        console.error('🗑️ Error deleting WordPress event:', error_8);
                        throw error_8;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get WordPress event details
     */
    WordPressService.prototype.getEvent = function (eventId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, error_9;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, (0, node_fetch_1.default)("".concat(this.siteUrl, "/wp-json/").concat(this.apiVersion, "/events/").concat(eventId), {
                                headers: this.getHeaders()
                            })];
                    case 1:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.text()];
                    case 2:
                        error = _a.sent();
                        throw new Error("WordPress get event failed: ".concat(response.status, " - ").concat(error));
                    case 3: return [4 /*yield*/, response.json()];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5:
                        error_9 = _a.sent();
                        console.error('Error fetching WordPress event:', error_9);
                        throw error_9;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Convert our event data to WordPress Events Calendar format
     */
    WordPressService.prototype.convertEventData = function (eventData, venueId) {
        var _a;
        var startDate = new Date(eventData.date_time);
        var endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours default
        // Create event content with location strategy
        var generalLocation = eventData.venue
            ? "".concat(eventData.venue.city, ", ").concat(eventData.venue.state)
            : 'Location TBD';
        var specificLocation = eventData.venue
            ? "".concat(eventData.venue.name, ", ").concat(eventData.venue.street_address, ", ").concat(eventData.venue.city, ", ").concat(eventData.venue.state, " ").concat(eventData.venue.zip_code)
            : 'Location TBD';
        // Enhanced content with RSVP call-to-action
        var content = "\n      <div class=\"kinky-coffee-event\">\n        <div class=\"event-description\">\n          ".concat(eventData.description || eventData.ai_generated_description || '', "\n        </div>\n        \n        <div class=\"event-details\">\n          <h3>Event Details</h3>\n          <ul>\n            <li><strong>When:</strong> ").concat(startDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }), " at ").concat(startDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }), "</li>\n            <li><strong>Where:</strong> ").concat(generalLocation, "</li>\n            <li><strong>RSVP:</strong> Required for specific location details</li>\n          </ul>\n        </div>\n        \n        <div class=\"event-rsvp-cta\">\n          <p><strong>\u2615 Join us for coffee, conversation, and community!</strong></p>\n          <p>\uD83D\uDC8C <strong>RSVP below to receive the specific venue location</strong></p>\n        </div>\n      </div>\n    ");
        var wordpressEvent = {
            title: eventData.title || eventData.theme || 'Kinky Coffee Event',
            content: content,
            excerpt: (eventData.description || eventData.ai_generated_description || '').substring(0, 150) + '...',
            status: 'publish',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            all_day: false,
            timezone: 'America/Los_Angeles', // TODO: Make configurable
            meta: {
                '_kinky_coffee_general_location': generalLocation,
                '_kinky_coffee_specific_location': specificLocation,
                '_kinky_coffee_rsvp_required': 'true',
                '_kinky_coffee_event_id': ((_a = eventData.id) === null || _a === void 0 ? void 0 : _a.toString()) || '',
                '_kinky_coffee_source': 'event_distribution_app'
            }
        };
        if (venueId) {
            wordpressEvent.venue_id = venueId;
        }
        return wordpressEvent;
    };
    /**
     * Generate WordPress event URL for RSVP
     */
    WordPressService.prototype.generateEventUrl = function (eventId, source) {
        if (source === void 0) { source = 'direct'; }
        var baseUrl = "".concat(this.siteUrl, "/events"); // Assuming Events Calendar permalink structure
        return "".concat(baseUrl, "/?event_id=").concat(eventId, "&source=").concat(source);
    };
    return WordPressService;
}());
exports.WordPressService = WordPressService;
exports.default = WordPressService;
