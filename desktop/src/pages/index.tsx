import React, { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CaptureFrame } from '@/components/CaptureFrame';
import { TranslationPanel } from '@/components/TranslationPanel';
import { LanguageSelector } from '@/components/LanguageSelector';
import { VoiceControls } from '@/components/VoiceControls';
import { Camera, Languages, Volume2, Settings } from 'lucide-react';

interface TextData {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: Date;
}

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [textData, setTextData] = useState<TextData | null>(null);
  const [framePosition, setFramePosition] = useState({ x: 100, y: 100, width: 400, height: 200 });
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('pt');
  const [isReading, setIsReading] = useState(false);

  const handleCapture = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Invoke Tauri command for screen capture
      const capturedImage = await invoke('capture_screen', {
        x: framePosition.x,
        y: framePosition.y,
        width: framePosition.width,
        height: framePosition.height,
      });

      // Process OCR
      const extractedText = await invoke('extract_text', { image: capturedImage });
      
      // Translate text
      const translatedText = await invoke('translate_text', {
        text: extractedText,
        from: sourceLanguage,
        to: targetLanguage,
      });

      setTextData({
        originalText: extractedText,
        translatedText: translatedText,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [framePosition, sourceLanguage, targetLanguage]);

  const handleSpeak = useCallback(async () => {
    if (!textData?.translatedText) return;
    
    setIsReading(true);
    try {
      await invoke('speak_text', {
        text: textData.translatedText,
        language: targetLanguage,
      });
    } catch (error) {
      console.error('TTS failed:', error);
    } finally {
      setIsReading(false);
    }
  }, [textData, targetLanguage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="p-6 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
              <Languages className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Babelink</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Capture, Translate & Listen</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Ready
            </Badge>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6">
        {/* Language Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Languages className="w-5 h-5" />
              <span>Language Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LanguageSelector
                label="From"
                value={sourceLanguage}
                onChange={setSourceLanguage}
                allowAuto={true}
              />
              <LanguageSelector
                label="To"
                value={targetLanguage}
                onChange={setTargetLanguage}
                allowAuto={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Capture Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Screen Capture</span>
              </div>
              <Button
                onClick={handleCapture}
                disabled={isCapturing}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {isCapturing ? 'Capturing...' : 'Capture Text'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CaptureFrame
              position={framePosition}
              onPositionChange={setFramePosition}
              isActive={isCapturing}
            />
          </CardContent>
        </Card>

        {/* Translation Results */}
        {textData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Translation Results</span>
                <div className="flex items-center space-x-2">
                  <VoiceControls
                    isReading={isReading}
                    onSpeak={handleSpeak}
                    language={targetLanguage}
                  />
                  <Button
                    onClick={handleSpeak}
                    disabled={isReading}
                    variant="outline"
                    size="sm"
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {isReading ? 'Speaking...' : 'Listen'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TranslationPanel textData={textData} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}